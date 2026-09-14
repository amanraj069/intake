import { request, requestPage } from "./apiClient";
import { todayAsInputValue } from "./formatDate";
import { toQueryString } from "./queryString";
import type { ChatExchange, ChatMessage, ConfirmedChatAction, PendingChatAction } from "@/types/chat";

export const chatApi = {
  /** One page of the thread, most recent page first. */
  getChatHistory: (page: number, limit: number) =>
    requestPage<ChatMessage>(`/api/chat/history${toQueryString({ page, limit })}`),

  /** The user's own day travels with each message, so "today" means their today, not the server's. */
  sendChatMessage: (message: string) =>
    request<ChatExchange>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, today: todayAsInputValue() }),
    }),

  /** `messageId` is the reply that proposed the action, which the server marks as confirmed. */
  confirmChatAction: (messageId: string, { tool, args }: PendingChatAction) =>
    request<ConfirmedChatAction>("/api/chat/confirm-action", {
      method: "POST",
      body: JSON.stringify({ messageId, tool, args }),
    }),
};
