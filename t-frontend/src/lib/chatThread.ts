import { ApiError } from "./apiClient";
import type { ChatMessage, ChatMessageFailure, ChatThreadAction, ChatThreadMessage, PendingChatAction } from "@/types/chat";

const LOCAL_ID_PREFIX = "local-";

export function toLocalMessageId(counter: number): string {
  return `${LOCAL_ID_PREFIX}${counter}`;
}

/** A message the server never stored: retrying it sends it again from scratch. */
export function isUnsentMessage(message: ChatThreadMessage): boolean {
  return message.id.startsWith(LOCAL_ID_PREFIX);
}

/**
 * A live proposal carries its arguments and can be confirmed; a live estimate
 * is already resolved, since nothing about it can be saved. From history every
 * stored action is rebuilt as a card with its stored arguments, so a proposal
 * the user left undecided (by switching pages or reloading) still asks for a
 * decision. A pending proposal stored without arguments cannot be confirmed,
 * so it reads as a plain reply.
 */
function toThreadAction(message: ChatMessage, pendingAction: PendingChatAction | null): ChatThreadAction | null {
  if (pendingAction) {
    const status = pendingAction.tool === "estimateNutrition" ? "estimate" : "pending";
    return { payload: pendingAction, status, error: null };
  }
  const stored = message.action;
  if (!stored || (stored.status === "pending" && !stored.args)) return null;

  const storedPayload = { tool: stored.tool, args: stored.args ?? {}, preview: message.content };
  return { payload: storedPayload, status: stored.status, error: null };
}

/**
 * The composer stays locked while a proposal is undecided, so a pending
 * proposal with a user message after it was left behind before cancelling was
 * saved. It reads as a plain reply rather than asking again.
 */
function retireSupersededProposals(thread: ChatThreadMessage[]): ChatThreadMessage[] {
  const lastUserIndex = thread.map((message) => message.role).lastIndexOf("user");
  return thread.map((message, index) =>
    message.action?.status === "pending" && index < lastUserIndex ? { ...message, action: null } : message
  );
}

function toStoredFailure(message: ChatMessage): ChatMessageFailure | null {
  if (!message.replyError) return null;
  return { message: message.replyError.message, code: message.replyError.code ?? "UNKNOWN", retryable: true };
}

export function toThreadMessage(message: ChatMessage, pendingAction: PendingChatAction | null = null): ChatThreadMessage {
  const failure = toStoredFailure(message);
  return {
    id: message._id,
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl ?? null,
    delivery: failure ? "failed" : "sent",
    failure,
    replyRequestedAt: message.replyRequestedAt ?? message.createdAt,
    action: toThreadAction(message, pendingAction),
    statusMessage: null,
  };
}

/** The stored user message a failed send or retry reports back, so it stays in the thread and can be retried by id. */
export function storedMessageFrom(cause: unknown): ChatMessage | null {
  if (!(cause instanceof ApiError)) return null;
  const stored = cause.details?.userMessage as ChatMessage | undefined;
  return stored?._id ? stored : null;
}

/**
 * Prepends an older history page (which the API returns newest first). New
 * messages sent since the first page shift every later page, so a page can
 * repeat messages already shown; those are dropped by id.
 */
export function prependOlderPage(thread: ChatThreadMessage[], olderPage: ChatMessage[]): ChatThreadMessage[] {
  const shownIds = new Set(thread.map((message) => message.id));
  const older = olderPage
    .filter((message) => !shownIds.has(message._id))
    .reverse()
    .map((message) => toThreadMessage(message));
  return retireSupersededProposals([...older, ...thread]);
}

export function updateThreadMessage(
  thread: ChatThreadMessage[],
  id: string,
  update: (message: ChatThreadMessage) => ChatThreadMessage
): ChatThreadMessage[] {
  return thread.map((message) => (message.id === id ? update(message) : message));
}

/** Swaps one message for others in the same place, e.g. an optimistic message for the stored message and its reply. */
export function replaceThreadMessage(
  thread: ChatThreadMessage[],
  id: string,
  replacements: ChatThreadMessage[]
): ChatThreadMessage[] {
  return thread.flatMap((message) => (message.id === id ? replacements : [message]));
}

export function updateThreadAction(
  thread: ChatThreadMessage[],
  id: string,
  changes: Partial<ChatThreadAction>
): ChatThreadMessage[] {
  return updateThreadMessage(thread, id, (message) =>
    message.action ? { ...message, action: { ...message.action, ...changes } } : message
  );
}

/**
 * The newest message, when it is the user's own, stored, and not marked as
 * failed. Its reply may still be in production: the server keeps working when
 * the page reloads, and records a failure on the message if the reply fails.
 */
export function findUnansweredMessage(thread: ChatThreadMessage[]): ChatThreadMessage | null {
  const newest = thread.at(-1);
  if (newest?.role !== "user" || newest.delivery !== "sent" || !newest.replyRequestedAt) return null;
  return newest;
}

export type AwaitedReplyOutcome =
  | { kind: "waiting" }
  | { kind: "answered"; replies: ChatThreadMessage[] }
  | { kind: "failed"; message: ChatThreadMessage }
  | { kind: "missing" };

/** Reads the newest history page (newest first) for what became of the awaited message. */
export function readAwaitedReply(newestFirst: ChatMessage[], awaitedId: string): AwaitedReplyOutcome {
  const index = newestFirst.findIndex((message) => message._id === awaitedId);
  if (index === -1) return { kind: "missing" };
  if (newestFirst[index].replyError) return { kind: "failed", message: toThreadMessage(newestFirst[index]) };
  if (index === 0) return { kind: "waiting" };

  const replies = newestFirst
    .slice(0, index)
    .reverse()
    .map((message) => toThreadMessage(message));
  return { kind: "answered", replies };
}

/**
 * Puts a deleted message back where it was: right after `afterId`, or at the
 * very start when it had no earlier message. Used both for "Undo" and for
 * quietly reverting an optimistic delete the server rejected.
 */
export function reinsertThreadMessage(
  thread: ChatThreadMessage[],
  message: ChatThreadMessage,
  afterId: string | null
): ChatThreadMessage[] {
  if (thread.some((existing) => existing.id === message.id)) return thread;
  if (afterId === null) return [message, ...thread];

  const index = thread.findIndex((existing) => existing.id === afterId);
  if (index === -1) return [...thread, message];
  return [...thread.slice(0, index + 1), message, ...thread.slice(index + 1)];
}

export function appendNewMessages(thread: ChatThreadMessage[], incoming: ChatThreadMessage[]): ChatThreadMessage[] {
  const shownIds = new Set(thread.map((message) => message.id));
  return [...thread, ...incoming.filter((message) => !shownIds.has(message.id))];
}

/** While a proposed change is undecided, a follow-up message could refer to it ambiguously. */
export function hasUndecidedAction(thread: ChatThreadMessage[]): boolean {
  return thread.some((message) => message.action?.status === "pending" || message.action?.status === "confirming");
}
