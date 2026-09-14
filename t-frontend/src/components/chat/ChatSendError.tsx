"use client";

import AiAvatar from "./AiAvatar";
import { RefreshIcon } from "@/components/icons";
import type { ChatMessageFailure } from "@/types/chat";

interface ChatSendErrorProps {
  failure: ChatMessageFailure;
  /** Omitted when the message cannot be retried, e.g. a newer message has been sent since. */
  onRetry?: () => void;
  /** Only offered for a message the server never stored. */
  onEdit?: () => void;
  showAvatar?: boolean;
}

/**
 * Renders as a message from the Assistant informing that the assistant is unavailable,
 * with a retry button embedded at the end of the message towards the extreme right.
 */
export default function ChatSendError({ failure, onRetry, onEdit, showAvatar = true }: ChatSendErrorProps) {
  const messageText =
    failure.code === "AI_UNAVAILABLE" || failure.message.toLowerCase().includes("unavailable")
      ? "Assistant is unavailable right now."
      : failure.message || "Assistant is unavailable right now.";

  return (
    <div className="flex justify-start items-end gap-2.5">
      <AiAvatar visible={showAvatar} />
      <div
        role="alert"
        className="group flex w-full max-w-[94%] sm:max-w-[75%] flex-wrap sm:flex-nowrap items-center justify-between gap-3.5 rounded-2xl rounded-bl-md border border-border dark:border-dark-border/50 bg-bg-card dark:bg-dark-bg-card px-4 py-3 sm:px-5 sm:py-3 text-[13px] leading-normal sm:text-sm sm:leading-relaxed text-text-primary dark:text-dark-text shadow-2xs"
      >
        <span className="sr-only">Assistant: </span>
        <span className="font-normal text-text-primary dark:text-dark-text">
          {messageText}
        </span>

        {(onRetry || onEdit) && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center rounded-xl sm:rounded-2xl border border-border dark:border-dark-border bg-bg-app dark:bg-dark-surface px-3 py-1.5 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text cursor-pointer transition-all duration-150"
              >
                Edit
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-xl sm:rounded-2xl border border-border dark:border-dark-border bg-bg-app dark:bg-dark-surface px-4 py-1.5 sm:px-4.5 sm:py-2 text-xs sm:text-sm font-semibold text-accent dark:text-accent-dark hover:bg-bg-card dark:hover:bg-dark-bg-card hover:border-accent/50 dark:hover:border-accent-dark/50 hover:shadow-xs cursor-pointer transition-all duration-150 shadow-2xs"
              >
                <RefreshIcon className="h-4 w-4 text-accent dark:text-accent-dark" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

