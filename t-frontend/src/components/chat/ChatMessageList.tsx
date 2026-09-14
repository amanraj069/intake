"use client";

import { useLayoutEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import type { ChatSendFailure } from "@/hooks/useChatThread";
import type { ChatThreadMessage } from "@/types/chat";
import ChatBubble from "./ChatBubble";
import ChatSendError from "./ChatSendError";
import ChatTypingIndicator from "./ChatTypingIndicator";
import PendingActionCard from "./PendingActionCard";

interface ChatMessageListProps {
  messages: ChatThreadMessage[];
  sending: boolean;
  sendFailure: ChatSendFailure | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  earlierError: string | null;
  onLoadEarlier: () => void;
  onRetryFailed: () => void;
  onEditFailed: () => void;
  onConfirmAction: (messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  /** Focuses the composer so the user can log another meal. */
  onLogAnother?: () => void;
}

/**
 * Keeps the newest turn in view as the thread grows, except when an older page
 * is prepended: then the view stays anchored on what the user was reading
 * instead of jumping back to the bottom.
 */
function useThreadScroll(messages: ChatThreadMessage[], sending: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstId = messages[0]?.id;
  const lastId = messages.at(-1)?.id;
  const previous = useRef({ firstId, lastId, scrollHeight: 0 });

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const olderPagePrepended = previous.current.scrollHeight > 0 && previous.current.firstId !== firstId && previous.current.lastId === lastId;
    container.scrollTop = olderPagePrepended
      ? container.scrollTop + container.scrollHeight - previous.current.scrollHeight
      : container.scrollHeight;

    previous.current = { firstId, lastId, scrollHeight: container.scrollHeight };
  }, [firstId, lastId, sending]);

  return scrollRef;
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
  sendFailure,
  hasEarlier,
  loadingEarlier,
  earlierError,
  onLoadEarlier,
  onRetryFailed,
  onEditFailed,
  onConfirmAction,
  onCancelAction,
  onLogAnother,
}: ChatMessageListProps) {
  const scrollRef = useThreadScroll(messages, sending);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-6 sm:px-8 sm:pt-10 sm:pb-4 lg:px-12">
      <ol aria-label="Conversation" aria-live="polite" className="mx-auto w-full max-w-5xl space-y-3 sm:space-y-4">
        {hasEarlier && (
          <li>
            <EarlierMessagesControl loading={loadingEarlier} error={earlierError} onLoad={onLoadEarlier} />
          </li>
        )}
        {messages.map((message) => (
          <li key={message.id} className="space-y-2">
            {message.action ? (
              <PendingActionCard
                action={message.action}
                onConfirm={() => onConfirmAction(message.id)}
                onCancel={() => onCancelAction(message.id)}
                onLogAnother={onLogAnother}
              />
            ) : (
              <ChatBubble message={message} />
            )}
            {sendFailure?.messageId === message.id && (
              <ChatSendError failure={sendFailure} onRetry={onRetryFailed} onEdit={onEditFailed} />
            )}
          </li>
        ))}
        {sending && (
          <li>
            <ChatTypingIndicator />
          </li>
        )}
      </ol>
    </div>
  );
}
