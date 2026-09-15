import { request, requestPage } from "./apiClient";
import { todayAsInputValue } from "./formatDate";
import { toQueryString } from "./queryString";
import type { ChatExchange, ChatMessage, ConfirmedChatAction, PendingChatAction } from "@/types/chat";

function toChatMessageForm(message: string, image: File): FormData {
  const form = new FormData();
  form.append("image", image, image.name);
  form.append("message", message);
  form.append("today", todayAsInputValue());
  return form;
}

export const chatApi = {
  /** One page of the thread, newest first. With `before`, only messages older than that message id. */
  getChatHistory: (page: number, limit: number, before?: string) =>
    requestPage<ChatMessage>(`/api/chat/history${toQueryString({ page, limit, before })}`),

  /**
   * The user's own day travels with each message, so "today" means their today,
   * not the server's. A photo switches the request to multipart.
   */
  sendChatMessage: (message: string, image?: File) =>
    request<ChatExchange>("/api/chat", {
      method: "POST",
      body: image ? toChatMessageForm(message, image) : JSON.stringify({ message, today: todayAsInputValue() }),
    }),

  /** Produces the reply again for the user's latest message, whose reply failed or never arrived. */
  retryChatMessage: (messageId: string) =>
    request<ChatExchange>(`/api/chat/messages/${messageId}/retry`, {
      method: "POST",
      body: JSON.stringify({ today: todayAsInputValue() }),
    }),

  /** `messageId` is the reply that proposed the action, which the server marks as confirmed. */
  confirmChatAction: (messageId: string, { tool, args }: PendingChatAction) =>
    request<ConfirmedChatAction>("/api/chat/confirm-action", {
      method: "POST",
      body: JSON.stringify({ messageId, tool, args }),
    }),

  /** Removes a message from the caller's own thread. Never reverses what its reply already did. */
  deleteChatMessage: (messageId: string) =>
    request<ChatMessage>(`/api/chat/messages/${messageId}`, { method: "DELETE" }),

  /** Undoes a delete, within the window the client still offers "Undo". */
  restoreChatMessage: (messageId: string) =>
    request<ChatMessage>(`/api/chat/messages/${messageId}/restore`, { method: "POST" }),
};
