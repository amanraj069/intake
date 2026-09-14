import type { FoodEntry, Goal } from "./nutrition";

export type ChatRole = "user" | "assistant";

export type ChatWriteTool = "logMeal" | "setGoal";

/** Stored on a reply that proposed a change. A cancelled proposal is never reported, so it stays pending. */
export interface StoredChatAction {
  tool: ChatWriteTool;
  status: "pending" | "confirmed";
}

/** One stored turn of the assistant thread, as the API returns it. */
export interface ChatMessage {
  _id: string;
  role: ChatRole;
  content: string;
  action?: StoredChatAction;
  createdAt: string;
}

/** A change the assistant proposed, which is only saved once the user confirms it. */
export interface PendingChatAction {
  tool: ChatWriteTool;
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

export type ChatActionStatus = "pending" | "confirming" | "confirmed" | "cancelled";

export interface ChatThreadAction {
  payload: PendingChatAction;
  status: ChatActionStatus;
  /** Why the last confirm attempt failed, shown on the card so it can be retried. */
  error: string | null;
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
  delivery: "sent" | "sending" | "failed";
  action: ChatThreadAction | null;
}
