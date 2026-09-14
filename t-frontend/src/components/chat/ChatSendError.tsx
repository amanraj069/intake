"use client";

import Button from "@/components/ui/Button";
import type { ChatSendFailure } from "@/hooks/useChatThread";

interface ChatSendErrorProps {
  failure: ChatSendFailure;
  onRetry: () => void;
  onEdit: () => void;
}

/** Sits under the message that failed, with a way to resend it or take it back to edit. */
export default function ChatSendError({ failure, onRetry, onEdit }: ChatSendErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-end gap-2 text-right">
      <p className="max-w-[85%] text-xs text-error dark:text-error-dark">{failure.message}</p>
      <div className="flex gap-2">
        {failure.retryable && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit message
        </Button>
      </div>
    </div>
  );
}
