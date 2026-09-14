"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { toAiRequestFailure } from "@/lib/aiRequestFailure";
import {
  hasUndecidedAction,
  isUnsentMessage,
  reinsertThreadMessage,
  replaceThreadMessage,
  storedMessageFrom,
  toLocalMessageId,
  toThreadMessage,
  updateThreadAction,
} from "@/lib/chatThread";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ChatExchange, ChatThreadMessage } from "@/types/chat";
import { useAwaitedReply } from "./useAwaitedReply";
import { useChatHistory } from "./useChatHistory";

/** Frees the local preview of a photo once the server's copy replaces it or the message is dropped. */
function releaseLocalPreview(message: ChatThreadMessage | undefined): void {
  if (message?.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(message.imageUrl);
}

function toExchangeMessages(exchange: ChatExchange): ChatThreadMessage[] {
  return [toThreadMessage(exchange.userMessage), toThreadMessage(exchange.assistantMessage, exchange.pendingAction)];
}

/**
 * The message that stays in the thread after a send or retry fails. When the
 * server stored the message before its reply failed, the stored copy is kept,
 * so it survives a reload and is retried by id. Otherwise the local copy stays.
 */
function toFailedMessage(message: ChatThreadMessage, cause: unknown): ChatThreadMessage {
  const failure = toAiRequestFailure(cause, "The assistant did not reply.");
  const stored = storedMessageFrom(cause);
  return { ...(stored ? toThreadMessage(stored) : message), delivery: "failed", failure };
}

/**
 * The assistant thread: stored history plus everything that happens during
 * this visit. User messages appear optimistically; a message whose reply fails
 * stays in place with a way to try again; a reply that proposes a change
 * carries an action the user confirms or cancels before sending more.
 */
export function useChatThread() {
  const history = useChatHistory();
  const { messages, setMessages } = history;
  const [sending, setSending] = useState(false);
  const localIdCounter = useRef(0);
  /** Photos of messages the server never stored, kept so "Try again" can upload them again. */
  const unsentImages = useRef(new Map<string, File>());

  const awaitingReply = useAwaitedReply(messages, setMessages, !history.loading);

  const runReplyRequest = useCallback(
    async (message: ChatThreadMessage, request: () => Promise<{ data?: ChatExchange }>) => {
      setSending(true);
      try {
        const { data } = await request();
        if (!data) throw new Error("The server did not return a reply");
        releaseLocalPreview(message);
        unsentImages.current.delete(message.id);
        setMessages((current) => replaceThreadMessage(current, message.id, toExchangeMessages(data)));
      } catch (cause) {
        const failed = toFailedMessage(message, cause);
        if (failed.id !== message.id) {
          releaseLocalPreview(message);
          unsentImages.current.delete(message.id);
        }
        setMessages((current) => replaceThreadMessage(current, message.id, [failed]));
      } finally {
        setSending(false);
      }
    },
    [setMessages]
  );

  const send = useCallback(
    (text: string, image?: File) => {
      const localId = toLocalMessageId(++localIdCounter.current);
      const optimistic: ChatThreadMessage = {
        id: localId,
        role: "user",
        content: text,
        imageUrl: image ? URL.createObjectURL(image) : null,
        delivery: "sending",
        failure: null,
        replyRequestedAt: null,
        action: null,
      };
      if (image) unsentImages.current.set(localId, image);

      setMessages((current) => [...current, optimistic]);
      return runReplyRequest(optimistic, () => api.sendChatMessage(text, image));
    },
    [runReplyRequest, setMessages]
  );

  /** A stored message is answered again in place; one the server never stored is sent again from scratch. */
  const retryFailedMessage = useCallback(
    (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (!target?.failure) return;

      if (isUnsentMessage(target)) {
        const image = unsentImages.current.get(messageId);
        releaseLocalPreview(target);
        setMessages((current) => current.filter((message) => message.id !== messageId));
        void send(target.content, image);
        return;
      }

      const retrying: ChatThreadMessage = { ...target, delivery: "sending", failure: null };
      setMessages((current) => replaceThreadMessage(current, messageId, [retrying]));
      void runReplyRequest(retrying, () => api.retryChatMessage(messageId));
    },
    [messages, runReplyRequest, send, setMessages]
  );

  /** Removes a message the server never stored and hands its text back, so the user can edit it before resending. */
  const takeBackFailedMessage = useCallback(
    (messageId: string): string => {
      const target = messages.find((message) => message.id === messageId);
      if (!target || !isUnsentMessage(target)) return "";
      releaseLocalPreview(target);
      unsentImages.current.delete(messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      return target.content;
    },
    [messages, setMessages]
  );

  const confirmAction = useCallback(
    async (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (!target?.action || target.action.status !== "pending") return;

      setMessages((current) => updateThreadAction(current, messageId, { status: "confirming", error: null }));

      try {
        await api.confirmChatAction(messageId, target.action.payload);
        setMessages((current) => updateThreadAction(current, messageId, { status: "confirmed" }));
      } catch (cause) {
        // Already saved elsewhere (another tab): the card should say so, not offer a retry that cannot succeed.
        if (cause instanceof ApiError && cause.code === "ACTION_ALREADY_CONFIRMED") {
          setMessages((current) => updateThreadAction(current, messageId, { status: "confirmed" }));
          return;
        }
        const error = toErrorMessage(cause, "Could not save this change. Try again.");
        setMessages((current) => updateThreadAction(current, messageId, { status: "pending", error }));
      }
    },
    [messages, setMessages]
  );

  const cancelAction = useCallback(
    (messageId: string) => {
      setMessages((current) => updateThreadAction(current, messageId, { status: "cancelled", error: null }));
    },
    [setMessages]
  );

  /** The most recently deleted message, kept only long enough for the "Undo" toast to offer it back. */
  const [deletedMessage, setDeletedMessage] = useState<ChatThreadMessage | null>(null);
  const deletedAfterId = useRef<string | null>(null);

  /**
   * Removes a message from view right away. Nothing it already did (a logged
   * meal, a saved goal) is reversed: only what the server rejects reappears.
   */
  const deleteMessage = useCallback(
    (messageId: string) => {
      const index = messages.findIndex((message) => message.id === messageId);
      if (index === -1) return;
      const target = messages[index];

      deletedAfterId.current = index > 0 ? messages[index - 1].id : null;
      setMessages((current) => current.filter((message) => message.id !== messageId));
      setDeletedMessage(target);

      if (isUnsentMessage(target)) return;

      void api.deleteChatMessage(messageId).catch(() => {
        setMessages((current) => reinsertThreadMessage(current, target, deletedAfterId.current));
        setDeletedMessage((current) => (current?.id === messageId ? null : current));
      });
    },
    [messages, setMessages]
  );

  /** Brings the last deleted message back, only once the server confirms it, so a failed undo never lies about it. */
  const undoDelete = useCallback(() => {
    const target = deletedMessage;
    if (!target) return;
    const afterId = deletedAfterId.current;
    setDeletedMessage(null);

    if (isUnsentMessage(target)) {
      setMessages((current) => reinsertThreadMessage(current, target, afterId));
      return;
    }

    setMessages((current) => reinsertThreadMessage(current, target, afterId));
    void api.restoreChatMessage(target.id).catch(() => {
      setMessages((current) => current.filter((message) => message.id !== target.id));
    });
  }, [deletedMessage, setMessages]);

  const dismissDeletedMessage = useCallback(() => setDeletedMessage(null), []);

  return {
    ...history,
    /** True while a message sent or retried here, or before a reload, is still waiting for its reply. */
    sending: sending || awaitingReply,
    awaitingDecision: hasUndecidedAction(messages),
    send: (text: string, image?: File) => void send(text, image),
    retryFailedMessage: (messageId: string) => retryFailedMessage(messageId),
    takeBackFailedMessage,
    confirmAction: (messageId: string) => void confirmAction(messageId),
    cancelAction,
    deleteMessage,
    deletedMessage,
    undoDelete,
    dismissDeletedMessage,
  };
}
