import type { FoodEntry, Goal } from "./nutrition";

export type ChatRole = "user" | "assistant";

export type ChatWriteTool = "logMeal" | "setGoal";

/** Every tool whose call is shown as a structured card, whether or not it can be confirmed. */
export type ChatActionTool = ChatWriteTool | "estimateNutrition";

/**
 * Stored on a reply that proposed a change, or that estimated a meal's
 * nutrition without saving anything. A cancelled proposal is never reported,
 * so it stays pending; an estimate is never confirmed, since it only answered
 * a question. `args` is missing on replies stored before the server kept them.
 */
export interface StoredChatAction {
  tool: ChatActionTool;
  status: "pending" | "confirmed" | "estimate";
  args?: Record<string, unknown>;
}

/** One stored turn of the assistant thread, as the API returns it. */
export interface ChatMessage {
  _id: string;
  role: ChatRole;
  /** Empty when the user sent only a photo. */
  content: string;
  imageUrl?: string;
  /** Set on a user message whose reply failed, until a retry starts. */
  replyError?: { message: string; code?: string };
  /** When a reply was last started for a user message. */
  replyRequestedAt?: string;
  action?: StoredChatAction;
  createdAt: string;
}

/**
 * A change the assistant proposed, which is only saved once the user
 * confirms it, or a nutrition estimate it produced, which is already final.
 */
export interface PendingChatAction {
  tool: ChatActionTool;
  args: Record<string, unknown>;
  preview: string;
}

export interface ChatExchange {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  pendingAction: PendingChatAction | null;
}

export interface ConfirmedChatAction {
  tool: ChatWriteTool;
  message: ChatMessage;
  foodEntry?: FoodEntry;
  goal?: Goal;
}

export type ChatActionStatus = "pending" | "confirming" | "confirmed" | "cancelled" | "estimate";

export interface ChatThreadAction {
  payload: PendingChatAction;
  status: ChatActionStatus;
  /** Why the last confirm attempt failed, shown on the card so it can be retried. */
  error: string | null;
}

/** Why a user message has no reply, shown beside it with a way to try again. */
export interface ChatMessageFailure {
  message: string;
  code: string;
  /** Whether sending it again could plausibly succeed. */
  retryable: boolean;
}

/**
 * A message as the thread renders it. `delivery` covers the optimistic window
 * before the server has stored a user message, and `action` is set only on an
 * assistant reply that proposed a change during this visit.
 */
export interface ChatThreadMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** The Cloudinary photo, or a local preview URL while the message is still sending. */
  imageUrl: string | null;
  delivery: "sent" | "sending" | "failed";
  failure: ChatMessageFailure | null;
  /** When a reply was last started for it; null until the server has stored it. */
  replyRequestedAt: string | null;
  action: ChatThreadAction | null;
}
