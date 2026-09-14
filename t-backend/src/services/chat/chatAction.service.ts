import { z } from 'zod';

import { AppError } from '../../middleware/errorHandler';
import { ChatMessage, IChatMessageDocument } from '../../models/ChatMessage';
import { IFoodEntryDocument } from '../../models/FoodEntry';
import { IGoalDocument } from '../../models/Goal';
import { ConfirmChatActionInput } from '../../schemas/chat.schema';
import { CreateFoodEntryInput } from '../../schemas/foodEntry.schema';
import { UpsertGoalInput } from '../../schemas/goal.schema';
import * as foodEntryService from '../foodEntry.service';
import * as goalService from '../goal.service';
import { describeValidationError } from './chatToolTypes';
import { logMealArgsSchema, setGoalArgsSchema } from './writeTools';

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

  if (await ChatMessage.exists(ownedProposal)) {
    throw new AppError('This change has already been saved.', 409, 'ACTION_ALREADY_CONFIRMED');
  }
  throw new AppError('That proposed change could not be found.', 404, 'ACTION_NOT_FOUND');
}

/** Hands the proposal back to pending when the write fails, so the user can confirm it again. */
async function releaseClaim(message: IChatMessageDocument): Promise<void> {
  try {
    await ChatMessage.updateOne({ _id: message._id }, { $set: { 'action.status': 'pending' } });
  } catch (releaseError) {
    console.error('[Chat] Could not reopen a proposal after its write failed:', releaseError);
  }
}

type ValidatedChatAction =
  | { tool: 'logMeal'; entry: CreateFoodEntryInput }
  | { tool: 'setGoal'; goal: UpsertGoalInput };

function validateAction(action: ConfirmChatActionInput): ValidatedChatAction {
  if (action.tool === 'setGoal') {
    return { tool: 'setGoal', goal: parseActionArgs(setGoalArgsSchema, action.args) };
  }
  // Provenance is the server's call, whatever the echoed args say.
  return { tool: 'logMeal', entry: { ...parseActionArgs(logMealArgsSchema, action.args), source: 'ai-chat' } };
}

async function executeAction(
  userId: string,
  action: ValidatedChatAction,
  message: IChatMessageDocument
): Promise<ConfirmedChatAction> {
  if (action.tool === 'setGoal') {
    return { tool: 'setGoal', message, goal: await goalService.upsertGoal(userId, action.goal) };
  }
  return { tool: 'logMeal', message, foodEntry: await foodEntryService.createFoodEntry(userId, action.entry) };
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
