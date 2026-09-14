"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { isUnsentMessage } from "@/lib/chatThread";
import type { ChatThreadMessage } from "@/types/chat";
import ChatBubble from "./ChatBubble";
import ChatSendError from "./ChatSendError";
import ChatTypingIndicator from "./ChatTypingIndicator";
import PendingActionCard from "./PendingActionCard";

interface ChatMessageListProps {
  messages: ChatThreadMessage[];
  sending: boolean;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  earlierError: string | null;
  onLoadEarlier: () => void;
  onRetryFailed: (messageId: string) => void;
  onEditFailed: (messageId: string) => void;
  onConfirmAction: (messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  /** Focuses the composer so the user can log another meal. */
  onLogAnother?: () => void;
}

/**
 * Keeps the newest turn in view as the thread grows, except when an older page
 * is prepended: then the view stays anchored on what the user was reading
 * instead of jumping back to the bottom.
 *
 * On initial visit or refresh, it guarantees the user lands at the bottom
 * of the chat even as async content (images, receipts, nutrition cards, fonts)
 * renders and expands.
 */
function useThreadScroll(messages: ChatThreadMessage[], sending: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLOListElement>(null);
  const isAtBottomRef = useRef(true);
  const skipNextResizeScrollRef = useRef(false);

  const firstId = messages[0]?.id;
  const lastId = messages.at(-1)?.id;
  const previous = useRef({ firstId, lastId, scrollHeight: 0 });

  const scrollToBottom = () => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  // Track whether the user has scrolled away from the bottom.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isAtBottomRef.current = distanceFromBottom <= 80;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const olderPagePrepended =
      previous.current.scrollHeight > 0 &&
      previous.current.firstId !== firstId &&
      previous.current.lastId === lastId;

    if (olderPagePrepended) {
      skipNextResizeScrollRef.current = true;
      container.scrollTop =
        container.scrollTop + container.scrollHeight - previous.current.scrollHeight;
    } else {
      if (previous.current.lastId !== lastId || sending) {
        isAtBottomRef.current = true;
      }
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    }

    previous.current = { firstId, lastId, scrollHeight: container.scrollHeight };
  }, [firstId, lastId, sending]);

  // Keep pinned to bottom across multiple frames after mount / refresh while layout settles
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    scrollToBottom();
    const rafId = requestAnimationFrame(scrollToBottom);
    const t1 = setTimeout(scrollToBottom, 60);
    const t2 = setTimeout(scrollToBottom, 200);
    const t3 = setTimeout(scrollToBottom, 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [firstId, lastId]);

  // Catch image loads in bubbles to ensure scroll stays pinned to bottom
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement && isAtBottomRef.current) {
        scrollToBottom();
      }
    };

    container.addEventListener("load", handleLoad, true);
    return () => container.removeEventListener("load", handleLoad, true);
  }, []);

  // ResizeObserver on the content to react to dynamic expansions (cards, charts, fonts)
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (skipNextResizeScrollRef.current) {
        skipNextResizeScrollRef.current = false;
        return;
      }
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { scrollRef, contentRef };
}

function EarlierMessagesControl({ loading, error, onLoad }: { loading: boolean; error: string | null; onLoad: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button size="sm" variant="ghost" loading={loading} onClick={onLoad}>
        {error ? "Retry loading earlier messages" : "Load earlier messages"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-error dark:text-error-dark">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ChatMessageList({
  messages,
  sending,
  hasEarlier,
  loadingEarlier,
  earlierError,
  onLoadEarlier,
  onRetryFailed,
  onEditFailed,
  onConfirmAction,
  onCancelAction,
  onDeleteMessage,
  onLogAnother,
}: ChatMessageListProps) {
  const { scrollRef, contentRef } = useThreadScroll(messages, sending);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-6 sm:px-8 sm:pt-8 sm:pb-4 lg:px-12">
      <ol ref={contentRef} aria-label="Conversation" aria-live="polite" className="mx-auto w-full max-w-5xl space-y-3 sm:space-y-4">
        {hasEarlier && (
          <li>
            <EarlierMessagesControl loading={loadingEarlier} error={earlierError} onLoad={onLoadEarlier} />
          </li>
        )}
        {messages.map((message, index) => {
          const isAssistant = message.role === "assistant" || message.action != null;
          const nextMessage = messages[index + 1];
          const isNextAssistant = nextMessage?.role === "assistant" || nextMessage?.action != null;
          const isLastInThread = !nextMessage;
          const showAvatar = isAssistant && !isNextAssistant && (!isLastInThread || !sending);
          // A message still sending has no server id yet, so it cannot be deleted until it lands.
          const onDelete = message.delivery === "sending" ? undefined : () => onDeleteMessage(message.id);

          return (
            <li key={message.id} className="space-y-2">
              {message.action ? (
                <PendingActionCard
                  action={message.action}
                  content={message.content}
                  showAvatar={showAvatar}
                  onConfirm={() => onConfirmAction(message.id)}
                  onCancel={() => onCancelAction(message.id)}
                  onLogAnother={onLogAnother}
                  onDelete={onDelete}
                />
              ) : (
                <ChatBubble
                  message={message}
                  prevMessage={messages[index - 1]}
                  showAvatar={showAvatar}
                  onDelete={onDelete}
                />
              )}
              {message.failure && (
                <ChatSendError
                  failure={message.failure}
                  // The server only answers the latest message again, so an older failure just explains itself.
                  onRetry={message.failure.retryable && isLastInThread && !sending ? () => onRetryFailed(message.id) : undefined}
                  onEdit={isUnsentMessage(message) && !sending ? () => onEditFailed(message.id) : undefined}
                />
              )}
            </li>
          );
        })}
        {sending && (
          <li>
            <ChatTypingIndicator />
          </li>
        )}
      </ol>
    </div>
  );
}
