"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import type { ChatStreamCallbacks } from "@/lib/chatApi";
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
  const activeAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeAbortController.current?.abort();
    };
  }, []);

  const awaitingReply = useAwaitedReply(messages, setMessages, !history.loading);

  const [showingPreviousChats, setShowingPreviousChats] = useState(false);
  // A reply still being produced after a reload means the user was mid-conversation: reopen it rather than hide it.
  if (awaitingReply && !showingPreviousChats) setShowingPreviousChats(true);

  const runStreamingReplyRequest = useCallback(
    async (
      userMessage: ChatThreadMessage,
      streamRequest: (callbacks: ChatStreamCallbacks, signal?: AbortSignal) => Promise<{ data?: ChatExchange }>
    ) => {
      setSending(true);
      const streamingReplyId = `streaming-reply-${userMessage.id}`;
      const controller = new AbortController();
      activeAbortController.current?.abort();
      activeAbortController.current = controller;

      const callbacks: ChatStreamCallbacks = {
        onStatus: (status: string) => {
          setMessages((current) => {
            const existing = current.find((m) => m.id === streamingReplyId);
            if (existing) {
              return current.map((m) =>
                m.id === streamingReplyId ? { ...m, statusMessage: status } : m
              );
            }
            const userIndex = current.findIndex((m) => m.id === userMessage.id);
            const streamingMessage: ChatThreadMessage = {
              id: streamingReplyId,
              role: "assistant",
              content: "",
              imageUrl: null,
              delivery: "streaming",
              failure: null,
              replyRequestedAt: null,
              action: null,
              statusMessage: status,
            };
            if (userIndex === -1) return [...current, streamingMessage];
            return [
              ...current.slice(0, userIndex + 1),
              streamingMessage,
              ...current.slice(userIndex + 1),
            ];
          });
        },
        onToken: (delta: string) => {
          setMessages((current) => {
            const existing = current.find((m) => m.id === streamingReplyId);
            if (existing) {
              return current.map((m) =>
                m.id === streamingReplyId
                  ? { ...m, content: m.content + delta, statusMessage: null }
                  : m
              );
            }
            const userIndex = current.findIndex((m) => m.id === userMessage.id);
            const streamingMessage: ChatThreadMessage = {
              id: streamingReplyId,
              role: "assistant",
              content: delta,
              imageUrl: null,
              delivery: "streaming",
              failure: null,
              replyRequestedAt: null,
              action: null,
              statusMessage: null,
            };
            if (userIndex === -1) return [...current, streamingMessage];
            return [
              ...current.slice(0, userIndex + 1),
              streamingMessage,
              ...current.slice(userIndex + 1),
            ];
          });
        },
      };

      try {
        const { data } = await streamRequest(callbacks, controller.signal);
        if (!data) throw new Error("The server did not return a reply");
        releaseLocalPreview(userMessage);
        unsentImages.current.delete(userMessage.id);
        setMessages((current) => {
          const withoutStreaming = current.filter((m) => m.id !== streamingReplyId);
          return replaceThreadMessage(withoutStreaming, userMessage.id, toExchangeMessages(data));
        });
      } catch (cause) {
        if ((cause as { name?: string })?.name === "AbortError") {
          setMessages((current) => current.filter((m) => m.id !== streamingReplyId));
          return;
        }
        const failed = toFailedMessage(userMessage, cause);
        if (failed.id !== userMessage.id) {
          releaseLocalPreview(userMessage);
          unsentImages.current.delete(userMessage.id);
        }
        setMessages((current) => {
          const withoutStreaming = current.filter((m) => m.id !== streamingReplyId);
          return replaceThreadMessage(withoutStreaming, userMessage.id, [failed]);
        });
      } finally {
        if (activeAbortController.current === controller) {
          activeAbortController.current = null;
        }
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
        statusMessage: null,
      };
      if (image) unsentImages.current.set(localId, image);

      setMessages((current) => [...current, optimistic]);
      return runStreamingReplyRequest(optimistic, (callbacks, signal) =>
        api.sendChatMessageStream(text, image, callbacks, signal)
      );
    },
    [runStreamingReplyRequest, setMessages]
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
      void runStreamingReplyRequest(retrying, (callbacks, signal) =>
        api.retryChatMessageStream(messageId, callbacks, signal)
      );
    },
    [messages, runStreamingReplyRequest, send, setMessages]
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

  /** Shows the cancel right away and saves it, so the proposal is not offered again after a reload. */
  const cancelAction = useCallback(
    async (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (target?.action?.status !== "pending") return;

      setMessages((current) => updateThreadAction(current, messageId, { status: "cancelled", error: null }));

      try {
        await api.cancelChatAction(messageId);
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === "ACTION_ALREADY_CANCELLED") return;
        // Saved elsewhere (another tab) before this cancel arrived: the card should say so.
        if (cause instanceof ApiError && cause.code === "ACTION_ALREADY_CONFIRMED") {
          setMessages((current) => updateThreadAction(current, messageId, { status: "confirmed" }));
          return;
        }
        const error = toErrorMessage(cause, "Could not cancel this change. Try again.");
        setMessages((current) => updateThreadAction(current, messageId, { status: "pending", error }));
      }
    },
    [messages, setMessages]
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

  const { archiveMessages, previousChatIds } = history;

  /** Clears the screen for a fresh conversation; everything shown so far joins the previous chats. */
  const startNewChat = useCallback(() => {
    activeAbortController.current?.abort();
    activeAbortController.current = null;
    archiveMessages(messages.map((message) => message.id));
    setDeletedMessage(null);
    setShowingPreviousChats(false);
  }, [archiveMessages, messages]);

  const showPreviousChats = useCallback(() => setShowingPreviousChats(true), []);

  const visibleMessages = showingPreviousChats
    ? messages
    : messages.filter((message) => !previousChatIds.has(message.id));

  return {
    ...history,
    /** The thread as it should be drawn: this visit's messages, plus earlier chats once the user opens them. */
    visibleMessages,
    showingPreviousChats,
    // A failed first load cannot tell whether there is history, so the way to retry it stays available.
    hasPreviousChats: previousChatIds.size > 0 || history.loadError !== null,
    showPreviousChats,
    startNewChat,
    /** True while a message sent or retried here, or before a reload, is still waiting for its reply. */
    sending: sending || awaitingReply,
    // Only a proposal on screen can be decided, so one hidden in previous chats never locks a new chat.
    awaitingDecision: hasUndecidedAction(visibleMessages),
    send: (text: string, image?: File) => void send(text, image),
    retryFailedMessage: (messageId: string) => retryFailedMessage(messageId),
    takeBackFailedMessage,
    confirmAction: (messageId: string) => void confirmAction(messageId),
    cancelAction: (messageId: string) => void cancelAction(messageId),
    deleteMessage,
    deletedMessage,
    undoDelete,
    dismissDeletedMessage,
  };
}
