import type { ChatMessage, ChatThreadAction, ChatThreadMessage, PendingChatAction } from "@/types/chat";

/**
 * A live proposal carries its arguments and can be confirmed. From history only
 * a confirmed proposal is rebuilt as a card: its arguments are not stored, so a
 * still-pending one could not be confirmed and reads as a plain reply instead.
 */
function toThreadAction(message: ChatMessage, pendingAction: PendingChatAction | null): ChatThreadAction | null {
  if (pendingAction) return { payload: pendingAction, status: "pending", error: null };
  if (message.action?.status !== "confirmed") return null;

  const savedPayload = { tool: message.action.tool, args: {}, preview: message.content };
  return { payload: savedPayload, status: "confirmed", error: null };
}

export function toThreadMessage(message: ChatMessage, pendingAction: PendingChatAction | null = null): ChatThreadMessage {
  return {
    id: message._id,
    role: message.role,
    content: message.content,
    delivery: "sent",
    action: toThreadAction(message, pendingAction),
  };
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
  return [...older, ...thread];
}

export function updateThreadMessage(
  thread: ChatThreadMessage[],
  id: string,
  update: (message: ChatThreadMessage) => ChatThreadMessage
): ChatThreadMessage[] {
  return thread.map((message) => (message.id === id ? update(message) : message));
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

/** While a proposed change is undecided, a follow-up message could refer to it ambiguously. */
export function hasUndecidedAction(thread: ChatThreadMessage[]): boolean {
  return thread.some((message) => message.action?.status === "pending" || message.action?.status === "confirming");
}
