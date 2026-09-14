"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/api";
import {
  appendNewMessages,
  findUnansweredMessage,
  readAwaitedReply,
  replaceThreadMessage,
  updateThreadMessage,
} from "@/lib/chatThread";
import type { ChatMessageFailure, ChatThreadMessage } from "@/types/chat";

/** Covers the server's 60 second turn budget plus a photo upload, with room for a slow network. It matches the server's retry window. */
const REPLY_WAIT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 2500;
/** The reply and the message it answers are always among the newest few. */
const RECENT_PAGE_SIZE = 5;

const TIMED_OUT_FAILURE: ChatMessageFailure = {
  message: "No reply arrived for this message.",
  code: "REPLY_TIMED_OUT",
  retryable: true,
};

const MISSING_FAILURE: ChatMessageFailure = {
  message: "This message is no longer in your conversation.",
  code: "MESSAGE_NOT_FOUND",
  retryable: false,
};

function markFailed(thread: ChatThreadMessage[], id: string, failure: ChatMessageFailure): ChatThreadMessage[] {
  return updateThreadMessage(thread, id, (message) => ({ ...message, delivery: "failed", failure }));
}

/**
 * Picks a reply back up after a reload. The original request's response is
 * gone with the old page, but the server still stores the reply (or the reason
 * there is none), so the thread polls for it and keeps showing the assistant as
 * busy until it lands. A message older than any turn could run is left alone.
 *
 * @returns whether a reply is being waited for.
 */
export function useAwaitedReply(
  messages: ChatThreadMessage[],
  setMessages: Dispatch<SetStateAction<ChatThreadMessage[]>>,
  enabled: boolean
): boolean {
  const unanswered = enabled ? findUnansweredMessage(messages) : null;
  const awaitedId = unanswered?.id ?? null;
  const replyRequestedAt = unanswered?.replyRequestedAt ?? null;
  const [expiredKey, setExpiredKey] = useState<string | null>(null);
  const awaitedKey = awaitedId && `${awaitedId}@${replyRequestedAt}`;

  useEffect(() => {
    if (!awaitedId || !replyRequestedAt) return;

    const deadline = Date.parse(replyRequestedAt) + REPLY_WAIT_MS;
    const expiredOnArrival = Date.now() >= deadline;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function checkForReply(id: string) {
      if (Date.now() >= deadline) {
        // Only a wait that ran out during this visit is a failure; an old unanswered message is just history.
        if (expiredOnArrival) setExpiredKey(`${id}@${replyRequestedAt}`);
        else setMessages((current) => markFailed(current, id, TIMED_OUT_FAILURE));
        return;
      }

      try {
        const response = await api.getChatHistory(1, RECENT_PAGE_SIZE);
        if (cancelled) return;
        const outcome = readAwaitedReply(response.data ?? [], id);
        if (outcome.kind === "answered") return setMessages((current) => appendNewMessages(current, outcome.replies));
        if (outcome.kind === "failed") return setMessages((current) => replaceThreadMessage(current, id, [outcome.message]));
        if (outcome.kind === "missing") return setMessages((current) => markFailed(current, id, MISSING_FAILURE));
      } catch {
        // One failed poll is not the reply failing: the next tick asks again, and the deadline still ends the wait.
      }

      if (!cancelled) timer = setTimeout(() => void checkForReply(id), POLL_INTERVAL_MS);
    }

    timer = setTimeout(() => void checkForReply(awaitedId), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [awaitedId, replyRequestedAt, setMessages]);

  return awaitedKey !== null && awaitedKey !== expiredKey;
}
