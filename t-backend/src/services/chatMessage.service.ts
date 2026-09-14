import { CalendarDay } from '../lib/calendarDay';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { ChatMessage, ChatRole, IChatMessageDocument, StoredChatAction } from '../models/ChatMessage';
import { ChatHistoryQuery } from '../schemas/chat.schema';
import { ChatHistoryTurn, runChatTurn } from './chatAgent';
import { PendingChatAction } from './chat/chatToolTypes';

/** How many stored turns are replayed to the model as context for a new message. */
const CONTEXT_TURN_COUNT = 20;

/** `_id` breaks ties between messages written in the same millisecond. */
const NEWEST_FIRST = { createdAt: -1, _id: -1 } as const;

export interface ChatExchange {
  userMessage: IChatMessageDocument;
  assistantMessage: IChatMessageDocument;
  pendingAction: PendingChatAction | null;
}

function saveChatMessage(
  userId: string,
  role: ChatRole,
  content: string,
  action?: StoredChatAction
): Promise<IChatMessageDocument> {
  return ChatMessage.create({ userId, role, content, action });
}

/** The user's most recent turns, oldest to newest, ready to replay as conversation history. */
async function loadRecentTurns(userId: string): Promise<ChatHistoryTurn[]> {
  const recent = await ChatMessage.find({ userId })
    .sort(NEWEST_FIRST)
    .limit(CONTEXT_TURN_COUNT)
    .select({ role: 1, content: 1, action: 1 })
    .lean();

  return recent.reverse().map(({ role, content, action }) => ({ role, content, actionStatus: action?.status }));
}

/**
 * A message whose reply failed is removed again, so the thread never holds a
 * question with no answer and the client can simply resend it. If the removal
 * itself fails, that is logged and the original failure still wins.
 */
async function discardUnansweredMessage(message: IChatMessageDocument): Promise<void> {
  try {
    await message.deleteOne();
  } catch (cleanupError) {
    console.error('[Chat] Could not remove an unanswered message:', cleanupError);
  }
}

/**
 * Stores the user's message, produces the assistant's reply, and stores that
 * too. The user message is written before the model is called, so it is part
 * of the thread even while a slow reply is in flight.
 */
export async function sendChatMessage(userId: string, message: string, today: CalendarDay): Promise<ChatExchange> {
  const history = await loadRecentTurns(userId);
  const userMessage = await saveChatMessage(userId, 'user', message);

  try {
    const turn = await runChatTurn({ history, message, context: { userId, today } });
    const action = turn.pendingAction ? { tool: turn.pendingAction.tool, status: 'pending' as const } : undefined;
    const assistantMessage = await saveChatMessage(userId, 'assistant', turn.reply, action);
    return { userMessage, assistantMessage, pendingAction: turn.pendingAction };
  } catch (error) {
    await discardUnansweredMessage(userMessage);
    throw error;
  }
}

/** One page of the thread, most recent page first, so "load earlier" is just the next page. */
export async function listChatHistory(
  userId: string,
  query: ChatHistoryQuery
): Promise<PaginatedResult<IChatMessageDocument>> {
  const [messages, total] = await Promise.all([
    ChatMessage.find({ userId }).sort(NEWEST_FIRST).skip(toSkipCount(query)).limit(query.limit),
    ChatMessage.countDocuments({ userId }),
  ]);

  return buildPaginatedResult(messages, total, query);
}
