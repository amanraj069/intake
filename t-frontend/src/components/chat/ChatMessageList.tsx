"use client";

import { useState } from "react";
import { HistoryIcon } from "@/components/icons";
import Spinner from "@/components/ui/Spinner";
import { useLoadOnScrollTop } from "@/hooks/useLoadOnScrollTop";
import { useThreadScroll } from "@/hooks/useThreadScroll";
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
  /** Set while earlier chats are hidden, to offer opening them above this visit's messages. */
  onShowPreviousChats?: () => void;
  /** Opens at the top of the loaded history, fades the messages in and glides down to the newest. */
  glideOnOpen?: boolean;
  onRetryFailed: (messageId: string) => void;
  onEditFailed: (messageId: string) => void;
  onConfirmAction: (messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  /** Focuses the composer so the user can log another meal. */
  onLogAnother?: () => void;
  onSend?: (message: string) => void;
}

/** Staggers the opening fade top to bottom, capped so a long history is not left waiting to appear. */
function openingDelayMs(index: number): number {
  return Math.min(index, 8) * 60;
}

const THREAD_NOTICE_CLASSES =
  "flex items-center justify-center gap-2 text-xs font-light text-text-secondary dark:text-dark-text-secondary";

const THREAD_LINK_CLASSES =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-text-secondary dark:text-dark-text-secondary " +
  "cursor-pointer transition-colors duration-150 hover:bg-bg-card dark:hover:bg-dark-bg-card hover:text-text-primary dark:hover:text-dark-text";

interface EarlierMessagesIndicatorProps {
  hasEarlier: boolean;
  loading: boolean;
  error: string | null;
  onLoad: () => void;
}

/** Sits above the oldest message: a hint to scroll up for more, a loading row, a retry, or the start of the thread. */
function EarlierMessagesIndicator({ hasEarlier, loading, error, onLoad }: EarlierMessagesIndicatorProps) {
  if (loading) {
    return (
      <div role="status" className={THREAD_NOTICE_CLASSES}>
        <Spinner size="sm" />
        Loading earlier messages
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p role="alert" className="text-xs text-error dark:text-error-dark">
          {error}
        </p>
        <button type="button" onClick={onLoad} className={THREAD_LINK_CLASSES}>
          Try again
        </button>
      </div>
    );
  }

  if (!hasEarlier) return <p className={THREAD_NOTICE_CLASSES}>Start of your conversation</p>;

  // Also a button, for touch screens where the thread is too short to scroll.
  return (
    <button type="button" onClick={onLoad} className={`${THREAD_LINK_CLASSES} mx-auto flex`}>
      Scroll up to load more
    </button>
  );
}

function PreviousChatsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${THREAD_LINK_CLASSES} mx-auto flex`}>
      <HistoryIcon className="h-3.5 w-3.5 text-accent dark:text-accent-dark" />
      Load previous chats
    </button>
  );
}

export default function ChatMessageList({
  messages,
  sending,
  hasEarlier,
  loadingEarlier,
  earlierError,
  onLoadEarlier,
  onShowPreviousChats,
  glideOnOpen = false,
  onRetryFailed,
  onEditFailed,
  onConfirmAction,
  onCancelAction,
  onDeleteMessage,
  onLogAnother,
  onSend,
}: ChatMessageListProps) {
  const { scrollRef, contentRef } = useThreadScroll(messages, sending, glideOnOpen);
  // Only the messages present on opening fade in; pages loaded later appear in place without replaying it.
  const [openingIds] = useState(() => (glideOnOpen ? new Set(messages.map((message) => message.id)) : null));
  const canLoadEarlier = !onShowPreviousChats && hasEarlier && !loadingEarlier && !earlierError;
  useLoadOnScrollTop(scrollRef, canLoadEarlier, onLoadEarlier);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-6 sm:px-8 sm:pt-8 sm:pb-4 lg:px-12">
      <ol ref={contentRef} aria-label="Conversation" aria-live="polite" className="mx-auto w-full max-w-5xl space-y-3 sm:space-y-4">
        <li>
          {onShowPreviousChats ? (
            <PreviousChatsButton onClick={onShowPreviousChats} />
          ) : (
            <EarlierMessagesIndicator
              hasEarlier={hasEarlier}
              loading={loadingEarlier}
              error={earlierError}
              onLoad={onLoadEarlier}
            />
          )}
        </li>
        {messages.map((message, index) => {
          const isAssistant = message.role === "assistant" || message.action != null;
          const nextMessage = messages[index + 1];
          const isNextAssistant = nextMessage?.role === "assistant" || nextMessage?.action != null;
          const isLastInThread = !nextMessage;
          const showAvatar = isAssistant && !isNextAssistant && (!isLastInThread || !sending);
          // A message still sending has no server id yet, so it cannot be deleted until it lands.
          const onDelete = message.delivery === "sending" ? undefined : () => onDeleteMessage(message.id);

          return (
            <li
              key={message.id}
              className={`space-y-2 ${openingIds?.has(message.id) ? "animate-flow-card" : ""}`}
              style={openingIds?.has(message.id) ? { animationDelay: `${openingDelayMs(index)}ms` } : undefined}
            >
              {message.action ? (
                <PendingActionCard
                  action={message.action}
                  content={message.content}
                  showAvatar={showAvatar}
                  onConfirm={() => onConfirmAction(message.id)}
                  onCancel={() => onCancelAction(message.id)}
                  onLogAnother={onLogAnother}
                  onDelete={onDelete}
                  onSend={onSend}
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
