import { Types } from 'mongoose';

import { CalendarDay } from '../lib/calendarDay';
import {
  UploadedImage,
  deleteUploadedImage,
  downloadUploadedImage,
  extractPublicIdFromUrl,
  uploadChatImage,
} from '../lib/cloudinary';
import { InlineImage } from '../lib/gemini/geminiClient';
import { toInlineImage } from '../lib/inlineImage';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { AppError } from '../middleware/errorHandler';
import { ChatMessage, ChatRole, IChatMessageDocument, StoredChatAction } from '../models/ChatMessage';
import { ChatHistoryQuery } from '../schemas/chat.schema';
import { ChatHistoryTurn, runChatTurn } from './chatAgent';
import { PendingChatAction } from './chat/chatToolTypes';

/** How many stored turns are replayed to the model as context for a new message. */
const CONTEXT_TURN_COUNT = 20;

/** `_id` breaks ties between messages written in the same millisecond. */
const NEWEST_FIRST = { createdAt: -1, _id: -1 } as const;

/** A message the user deleted from their own view of the thread. */
const NOT_DELETED = { deletedAt: { $exists: false } } as const;

export interface ChatExchange {
  userMessage: IChatMessageDocument;
  assistantMessage: IChatMessageDocument;
  pendingAction: PendingChatAction | null;
}

export interface SendChatMessageInput {
  /** Empty when only a photo was sent. */
  message: string;
  image?: Buffer;
  today: CalendarDay;
}

/**
 * How long a reply may still be in flight. Past this, a message with neither a
 * reply nor a recorded failure (the server stopped mid-turn) may be retried.
 * Matches the wait the client shows after a reload.
 */
const REPLY_IN_FLIGHT_MS = 2 * 60 * 1000;

interface NewChatMessage {
  role: ChatRole;
  content: string;
  image?: UploadedImage;
  action?: StoredChatAction;
}

function saveChatMessage(userId: string, { role, content, image, action }: NewChatMessage): Promise<IChatMessageDocument> {
  return ChatMessage.create({
    userId,
    role,
    content,
    imageUrl: image?.url,
    imagePublicId: image?.publicId,
    replyRequestedAt: role === 'user' ? new Date() : undefined,
    action,
  });
}

/**
 * The user's most recent answered turns, oldest to newest, ready to replay as
 * conversation history. Messages whose reply failed are left out, so a
 * question the model never saw is not merged into the next one.
 */
async function loadRecentTurns(userId: string, excludeMessageId?: Types.ObjectId): Promise<ChatHistoryTurn[]> {
  const recent = await ChatMessage.find({
    userId,
    replyError: { $exists: false },
    ...NOT_DELETED,
    ...(excludeMessageId ? { _id: { $ne: excludeMessageId } } : {}),
  })
    .sort(NEWEST_FIRST)
    .limit(CONTEXT_TURN_COUNT)
    .select({ role: 1, content: 1, imageUrl: 1, action: 1 })
    .lean();

  return recent.reverse().map(({ role, content, imageUrl, action }) => ({
    role,
    content,
    hadImage: Boolean(imageUrl),
    actionStatus: action?.status,
  }));
}

/** An estimate is never confirmed: it already answers the question, so it is stored resolved. */
function toStoredAction(pendingAction: PendingChatAction | null): StoredChatAction | undefined {
  if (!pendingAction) return undefined;
  const status = pendingAction.tool === 'estimateNutrition' ? 'estimate' : 'pending';
  return { tool: pendingAction.tool, status, args: pendingAction.args };
}

function toReplyError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  console.error('[Chat] Reply failed unexpectedly:', error);
  return new AppError('The assistant could not reply. Try again.', 500, 'CHAT_REPLY_FAILED');
}

/**
 * Keeps the unanswered message in the thread with the reason attached, so it
 * survives a reload with a retry option. The stored message travels back in
 * the error's details, so the client can retry it by id. If recording the
 * failure itself fails, that is logged and the original failure still wins.
 */
async function recordReplyFailure(userMessage: IChatMessageDocument, error: unknown): Promise<AppError> {
  const replyError = toReplyError(error);
  try {
    userMessage.replyError = { message: replyError.message, code: replyError.code };
    await userMessage.save();
  } catch (saveError) {
    console.error('[Chat] Could not record a failed reply:', saveError);
  }
  replyError.details = { userMessage: userMessage.toJSON() };
  return replyError;
}

interface ReplyRequest {
  userId: string;
  userMessage: IChatMessageDocument;
  history: ChatHistoryTurn[];
  image?: InlineImage;
  today: CalendarDay;
}

/** Runs the assistant turn for a stored user message and stores its reply, or records why there is none. */
async function produceReply({ userId, userMessage, history, image, today }: ReplyRequest): Promise<ChatExchange> {
  try {
    const turn = await runChatTurn({ history, message: userMessage.content, image, context: { userId, today } });
    const assistantMessage = await saveChatMessage(userId, {
      role: 'assistant',
      content: turn.reply,
      action: toStoredAction(turn.pendingAction),
    });
    return { userMessage, assistantMessage, pendingAction: turn.pendingAction };
  } catch (error) {
    throw await recordReplyFailure(userMessage, error);
  }
}

/**
 * Stores the user's message (uploading its photo to Cloudinary first, so the
 * thread can show it again later), produces the assistant's reply, and stores
 * that too. The user message is written before the model is called, so it is
 * part of the thread even while a slow reply is in flight, and it stays there
 * if the reply fails.
 */
export async function sendChatMessage(userId: string, input: SendChatMessageInput): Promise<ChatExchange> {
  const image = input.image ? toInlineImage(input.image) : undefined;
  const history = await loadRecentTurns(userId);
  const uploadedImage = input.image ? await uploadChatImage(input.image, userId) : undefined;
  const userMessage = await saveChatMessage(userId, { role: 'user', content: input.message, image: uploadedImage });

  return produceReply({ userId, userMessage, history, image, today: input.today });
}

/**
 * Takes a retry of the caller's latest message in one atomic update: its
 * recorded failure is cleared and a new reply is marked as started, so two
 * retries at once cannot both run. A message with no failure qualifies only
 * once its last reply has had longer than any turn can run.
 */
async function claimRetry(userId: string, messageId: string): Promise<IChatMessageDocument> {
  const owned = { _id: messageId, userId, role: 'user', ...NOT_DELETED };
  const [latest] = await ChatMessage.find({ userId }).sort(NEWEST_FIRST).limit(1).select({ _id: 1 }).lean();
  if (latest && latest._id.toString() !== messageId && (await ChatMessage.exists(owned))) {
    throw new AppError('Only your latest message can be retried.', 409, 'MESSAGE_NOT_LATEST');
  }

  const staleBefore = new Date(Date.now() - REPLY_IN_FLIGHT_MS);
  const claimed = await ChatMessage.findOneAndUpdate(
    {
      ...owned,
      $or: [
        { replyError: { $exists: true } },
        { replyRequestedAt: { $lt: staleBefore } },
        { replyRequestedAt: { $exists: false }, createdAt: { $lt: staleBefore } },
      ],
    },
    { $unset: { replyError: 1 }, $set: { replyRequestedAt: new Date() } },
    { new: true }
  );
  if (claimed) return claimed;

  if (await ChatMessage.exists(owned)) {
    throw new AppError('This message is already being answered.', 409, 'REPLY_IN_PROGRESS');
  }
  throw new AppError('That message could not be found.', 404, 'MESSAGE_NOT_FOUND');
}

/** Produces the reply again for the caller's latest message, reusing its stored photo. */
export async function retryChatMessage(userId: string, messageId: string, today: CalendarDay): Promise<ChatExchange> {
  const userMessage = await claimRetry(userId, messageId);

  try {
    const history = await loadRecentTurns(userId, userMessage._id);
    const image = userMessage.imageUrl ? toInlineImage(await downloadUploadedImage(userMessage.imageUrl)) : undefined;
    return await produceReply({ userId, userMessage, history, image, today });
  } catch (error) {
    if (error instanceof AppError && error.details) throw error;
    throw await recordReplyFailure(userMessage, error);
  }
}

/** One page of the thread, most recent page first, so "load earlier" is just the next page. */
export async function listChatHistory(
  userId: string,
  query: ChatHistoryQuery
): Promise<PaginatedResult<IChatMessageDocument>> {
  const [messages, total] = await Promise.all([
    ChatMessage.find({ userId, ...NOT_DELETED }).sort(NEWEST_FIRST).skip(toSkipCount(query)).limit(query.limit),
    ChatMessage.countDocuments({ userId, ...NOT_DELETED }),
  ]);

  return buildPaginatedResult(messages, total, query);
}

/**
 * Hides a message from the caller's own thread and from what the model is
 * shown next. If a photo was attached, it is deleted from Cloudinary.
 * Never touches anything the message's reply already did, such as a logged meal.
 */
export async function deleteChatMessage(userId: string, messageId: string): Promise<IChatMessageDocument> {
  const message = await ChatMessage.findOneAndUpdate(
    { _id: messageId, userId, ...NOT_DELETED },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!message) throw new AppError('That message could not be found.', 404, 'MESSAGE_NOT_FOUND');

  const publicId = message.imagePublicId || (message.imageUrl ? extractPublicIdFromUrl(message.imageUrl) : undefined);
  if (publicId) {
    await deleteUploadedImage(publicId).catch((error: unknown) => {
      console.error('[Cloudinary] Failed to delete chat image asset:', error);
    });
  }

  return message;
}

/** Undoes a delete within the window the client still offers "Undo", bringing the message straight back. */
export async function restoreChatMessage(userId: string, messageId: string): Promise<IChatMessageDocument> {
  const message = await ChatMessage.findOneAndUpdate(
    { _id: messageId, userId, deletedAt: { $exists: true } },
    { $unset: { deletedAt: 1 } },
    { new: true }
  );
  if (!message) throw new AppError('That message could not be restored.', 404, 'MESSAGE_NOT_FOUND');
  return message;
}
