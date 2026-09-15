import { z } from 'zod';

import { copyImageToMealFolder, deleteUploadedImage } from '../../lib/cloudinary';
import { AppError } from '../../middleware/errorHandler';
import { CHAT_WRITE_TOOLS, ChatMessage, IChatMessageDocument } from '../../models/ChatMessage';
import { IFoodEntryDocument } from '../../models/FoodEntry';
import { IGoalDocument } from '../../models/Goal';
import { ConfirmChatActionInput } from '../../schemas/chat.schema';
import { CreateFoodEntryInput } from '../../schemas/foodEntry.schema';
import * as foodEntryService from '../foodEntry.service';
import * as goalService from '../goal.service';
import { describeValidationError } from './chatToolTypes';
import { GoalChanges, applyGoalChanges } from './goalChanges';
import { logMealArgsSchema, setGoalArgsSchema, setGoalChangesSchema } from './writeTools';

export type ConfirmedChatAction =
  | { tool: 'logMeal'; message: IChatMessageDocument; foodEntry: IFoodEntryDocument }
  | { tool: 'setGoal'; message: IChatMessageDocument; goal: IGoalDocument };

/** The client echoes the action back, so it is checked again exactly as the underlying endpoint would. */
function parseActionArgs<TSchema extends z.ZodTypeAny>(schema: TSchema, args: unknown): z.infer<TSchema> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new AppError(
      `This action can no longer be saved. ${describeValidationError(parsed.error)}`,
      400,
      'INVALID_CHAT_ACTION'
    );
  }
  return parsed.data;
}

/**
 * Flips the proposing message from pending to confirmed in one atomic update,
 * before anything is written. A second confirm of the same proposal (a double
 * click, a second tab) finds nothing pending and is refused instead of saving
 * the meal twice.
 */
async function claimPendingAction(userId: string, action: ConfirmChatActionInput): Promise<IChatMessageDocument> {
  const ownedProposal = { _id: action.messageId, userId, role: 'assistant', 'action.tool': action.tool };
  const claimed = await ChatMessage.findOneAndUpdate(
    { ...ownedProposal, 'action.status': 'pending' },
    { $set: { 'action.status': 'confirmed' } },
    { new: true }
  );
  if (claimed) return claimed;
  throw await toUndecidableError(ownedProposal);
}

/** Why a proposal that is no longer pending cannot be confirmed or cancelled. */
async function toUndecidableError(ownedProposal: Record<string, unknown>): Promise<AppError> {
  const proposal = await ChatMessage.findOne(ownedProposal).select({ action: 1 }).lean();
  if (!proposal) return new AppError('That proposed change could not be found.', 404, 'ACTION_NOT_FOUND');
  if (proposal.action?.status === 'cancelled') {
    return new AppError('This change was cancelled.', 409, 'ACTION_ALREADY_CANCELLED');
  }
  return new AppError('This change has already been saved.', 409, 'ACTION_ALREADY_CONFIRMED');
}

/**
 * Marks a pending proposal as cancelled, so it is not offered again after a
 * reload. Only a pending proposal qualifies: a saved change stays saved.
 */
export async function cancelChatAction(userId: string, messageId: string): Promise<IChatMessageDocument> {
  const ownedProposal = { _id: messageId, userId, role: 'assistant', 'action.tool': { $in: CHAT_WRITE_TOOLS } };
  const cancelled = await ChatMessage.findOneAndUpdate(
    { ...ownedProposal, 'action.status': 'pending' },
    { $set: { 'action.status': 'cancelled' } },
    { new: true }
  );
  if (cancelled) return cancelled;
  throw await toUndecidableError(ownedProposal);
}

/** Hands the proposal back to pending when the write fails, so the user can confirm it again. */
async function releaseClaim(message: IChatMessageDocument): Promise<void> {
  try {
    await ChatMessage.updateOne({ _id: message._id }, { $set: { 'action.status': 'pending' } });
  } catch (releaseError) {
    console.error('[Chat] Could not reopen a proposal after its write failed:', releaseError);
  }
}

const NO_PHOTO_FIELDS = {
  imageUrl: undefined,
  imagePublicId: undefined,
  confidenceScore: undefined,
  confidenceLevel: undefined,
  extractionAnalysis: undefined,
} satisfies Partial<CreateFoodEntryInput>;

type ValidatedChatAction =
  | { tool: 'logMeal'; entry: CreateFoodEntryInput }
  | { tool: 'setGoal'; changes: GoalChanges };

function validateAction(action: ConfirmChatActionInput): ValidatedChatAction {
  if (action.tool === 'setGoal') {
    return { tool: 'setGoal', changes: parseActionArgs(setGoalChangesSchema, action.args) };
  }
  // Provenance is the server's call, whatever the echoed args say: a photo and
  // its confidence come only from the stored proposal, in `saveConfirmedMeal`.
  const entry = parseActionArgs(logMealArgsSchema, action.args);
  return { tool: 'logMeal', entry: { ...entry, ...NO_PHOTO_FIELDS, source: 'ai-chat' } };
}

/** Lays the confirmed targets over the goal as it is now, not as it was when proposed, so an edit made in between survives. */
async function saveGoalChanges(userId: string, changes: GoalChanges): Promise<IGoalDocument> {
  const currentGoal = await goalService.findGoalByUserId(userId);
  const goal = parseActionArgs(setGoalArgsSchema, applyGoalChanges(changes, currentGoal));
  return goalService.upsertGoal(userId, goal);
}

/** Removes a meal photo copy whose meal was never saved. A failure here is logged: the save error is what the user needs. */
async function discardMealImage(publicId: string): Promise<void> {
  try {
    await deleteUploadedImage(publicId);
  } catch (error) {
    console.error('[Chat] Could not remove the photo of a meal that failed to save:', error);
  }
}

/**
 * Saves the meal, and when it was proposed from a photo, that photo and its
 * confidence breakdown with it, exactly as a meal logged from a photo on the
 * Log Meal page is saved.
 */
async function saveConfirmedMeal(
  userId: string,
  entry: CreateFoodEntryInput,
  message: IChatMessageDocument
): Promise<IFoodEntryDocument> {
  const mealPhoto = message.action?.mealPhoto;
  if (!mealPhoto) return foodEntryService.createFoodEntry(userId, entry);

  const image = await copyImageToMealFolder(mealPhoto.imageUrl, userId);
  try {
    return await foodEntryService.createFoodEntry(userId, {
      ...entry,
      imageUrl: image.url,
      imagePublicId: image.publicId,
      confidenceScore: mealPhoto.analysis.confidence.score,
      confidenceLevel: mealPhoto.analysis.confidence.level,
      extractionAnalysis: mealPhoto.analysis,
    });
  } catch (error) {
    await discardMealImage(image.publicId);
    throw error;
  }
}

async function executeAction(
  userId: string,
  action: ValidatedChatAction,
  message: IChatMessageDocument
): Promise<ConfirmedChatAction> {
  if (action.tool === 'setGoal') {
    return { tool: 'setGoal', message, goal: await saveGoalChanges(userId, action.changes) };
  }
  return { tool: 'logMeal', message, foodEntry: await saveConfirmedMeal(userId, action.entry, message) };
}

/**
 * Carries out a write the user approved on a pending action card, and marks
 * the reply that proposed it as confirmed. No separate confirmation message is
 * stored: the proposal itself becomes the record of what was saved.
 */
export async function confirmChatAction(userId: string, action: ConfirmChatActionInput): Promise<ConfirmedChatAction> {
  // Validation runs before the claim, so a bad request never touches the proposal.
  const validated = validateAction(action);
  const message = await claimPendingAction(userId, action);

  try {
    return await executeAction(userId, validated, message);
  } catch (error) {
    await releaseClaim(message);
    throw error;
  }
}
