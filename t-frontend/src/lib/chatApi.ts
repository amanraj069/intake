import { request, requestPage, requestStream } from "./apiClient";
import type { SSEEvent } from "./apiClient";
import { nowAsTimeInputValue, todayAsInputValue } from "./formatDate";
import { toQueryString } from "./queryString";
import type { ChatExchange, ChatMessage, ConfirmedChatAction, PendingChatAction } from "@/types/chat";

export interface ChatStreamCallbacks {
  onToken?: (delta: string) => void;
  onStatus?: (status: string) => void;
}

/**
 * The user's own day and wall-clock time travel with each message, so "today"
 * means their today and a meal they do not name can default to the right one.
 */
function clientClock() {
  return { today: todayAsInputValue(), localTime: nowAsTimeInputValue() };
}

/** JSON normally; multipart when a photo is attached, with the same fields alongside it. */
function toChatMessageBody(message: string, image?: File): BodyInit {
  const fields = { message, ...clientClock() };
  if (!image) return JSON.stringify(fields);

  const form = new FormData();
  form.append("image", image, image.name);
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return form;
}

function toStreamEventHandler(callbacks: ChatStreamCallbacks) {
  return (event: SSEEvent) => {
    if (event.type === "token") callbacks.onToken?.((event.data as { delta: string }).delta);
    if (event.type === "status") callbacks.onStatus?.((event.data as { status: string }).status);
  };
}

export const chatApi = {
  /** One page of the thread, newest first. With `before`, only messages older than that message id. */
  getChatHistory: (page: number, limit: number, before?: string) =>
    requestPage<ChatMessage>(`/api/chat/history${toQueryString({ page, limit, before })}`),

  sendChatMessage: (message: string, image?: File) =>
    request<ChatExchange>("/api/chat", { method: "POST", body: toChatMessageBody(message, image) }),

  /** Streaming variant of `sendChatMessage`: the same POST, asking for `text/event-stream`. */
  sendChatMessageStream: (
    message: string,
    image: File | undefined,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ) =>
    requestStream<ChatExchange>(
      "/api/chat",
      { method: "POST", body: toChatMessageBody(message, image) },
      toStreamEventHandler(callbacks),
      signal
    ),

  /** Produces the reply again for the user's latest message, whose reply failed or never arrived. */
  retryChatMessage: (messageId: string) =>
    request<ChatExchange>(`/api/chat/messages/${messageId}/retry`, {
      method: "POST",
      body: JSON.stringify(clientClock()),
    }),

  /** Streaming variant of `retryChatMessage`. */
  retryChatMessageStream: (messageId: string, callbacks: ChatStreamCallbacks, signal?: AbortSignal) =>
    requestStream<ChatExchange>(
      `/api/chat/messages/${messageId}/retry`,
      { method: "POST", body: JSON.stringify(clientClock()) },
      toStreamEventHandler(callbacks),
      signal
    ),

  /** `messageId` is the reply that proposed the action, which the server marks as confirmed. */
  confirmChatAction: (messageId: string, { tool, args }: PendingChatAction) =>
    request<ConfirmedChatAction>("/api/chat/confirm-action", {
      method: "POST",
      body: JSON.stringify({ messageId, tool, args }),
    }),

  /** `messageId` is the reply that proposed the action, which the server marks as cancelled. */
  cancelChatAction: (messageId: string) =>
    request<ChatMessage>("/api/chat/cancel-action", { method: "POST", body: JSON.stringify({ messageId }) }),

  /** Removes a message from the caller's own thread. Never reverses what its reply already did. */
  deleteChatMessage: (messageId: string) =>
    request<ChatMessage>(`/api/chat/messages/${messageId}`, { method: "DELETE" }),

  /** Undoes a delete, within the window the client still offers "Undo". */
  restoreChatMessage: (messageId: string) =>
    request<ChatMessage>(`/api/chat/messages/${messageId}/restore`, { method: "POST" }),
};
