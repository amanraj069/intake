"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { toAiRequestFailure, type AiRequestFailure } from "@/lib/aiRequestFailure";
import { hasUndecidedAction, toThreadMessage, updateThreadAction, updateThreadMessage } from "@/lib/chatThread";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ChatThreadMessage } from "@/types/chat";
import { useChatHistory } from "./useChatHistory";

/** A message the server did not accept, kept so it can be resent or taken back into the composer. */
export interface ChatSendFailure extends AiRequestFailure {
  messageId: string;
  text: string;
}

/**
 * The assistant thread: stored history plus everything that happens during
 * this visit. User messages appear optimistically; a reply that proposes a
 * change carries an action the user confirms or cancels before sending more.
 */
export function useChatThread() {
  const history = useChatHistory();
  const { messages, setMessages } = history;
  const [sending, setSending] = useState(false);
  const [sendFailure, setSendFailure] = useState<ChatSendFailure | null>(null);
  const localIdCounter = useRef(0);

  const send = useCallback(
    async (text: string) => {
      const localId = `local-${++localIdCounter.current}`;
      const optimistic: ChatThreadMessage = { id: localId, role: "user", content: text, delivery: "sending", action: null };

      setSendFailure(null);
      setSending(true);
      setMessages((current) => [...current.filter((message) => message.delivery !== "failed"), optimistic]);

      try {
        const { data } = await api.sendChatMessage(text);
        if (!data) throw new Error("The server did not return a reply");
        setMessages((current) => [
          ...current.filter((message) => message.id !== localId),
          toThreadMessage(data.userMessage),
          toThreadMessage(data.assistantMessage, data.pendingAction),
        ]);
      } catch (cause) {
        setMessages((current) => updateThreadMessage(current, localId, (message) => ({ ...message, delivery: "failed" })));
        setSendFailure({ ...toAiRequestFailure(cause, "The assistant did not reply."), messageId: localId, text });
      } finally {
        setSending(false);
      }
    },
    [setMessages]
  );

  /** Removes the failed message and hands its text back, so the user can edit it before resending. */
  const takeBackFailedMessage = useCallback((): string => {
    if (!sendFailure) return "";
    setMessages((current) => current.filter((message) => message.id !== sendFailure.messageId));
    setSendFailure(null);
    return sendFailure.text;
  }, [sendFailure, setMessages]);

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

  return {
    ...history,
    sending,
    sendFailure,
    awaitingDecision: hasUndecidedAction(messages),
    send: (text: string) => void send(text),
    retryFailedMessage: () => {
      if (sendFailure) void send(sendFailure.text);
    },
    takeBackFailedMessage,
    confirmAction: (messageId: string) => void confirmAction(messageId),
    cancelAction,
  };
}
