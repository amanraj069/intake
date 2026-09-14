"use client";

import type { ChatThreadMessage } from "@/types/chat";
import AiAvatar from "./AiAvatar";

interface ChatBubbleProps {
  message: ChatThreadMessage;
}

const USER_CLASSES = "bg-accent-muted dark:bg-accent-dark-muted text-white rounded-br-md";
const ASSISTANT_CLASSES = "bg-bg-card dark:bg-dark-bg-card text-text-primary dark:text-dark-text rounded-bl-md border border-border dark:border-dark-border/50";

/** One plain turn of the conversation. Replies are plain text, so line breaks are kept as typed. */
export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const deliveryClasses =
    message.delivery === "sending"
      ? "opacity-60"
      : message.delivery === "failed"
        ? "ring-1 ring-error dark:ring-error-dark"
        : "";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p
          className={`max-w-[88%] sm:max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-[13px] leading-normal sm:text-sm sm:leading-relaxed transition-opacity duration-150 ${USER_CLASSES} ${deliveryClasses}`}
        >
          <span className="sr-only">You: </span>
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <AiAvatar className="mt-1" />
      <p
        className={`max-w-[94%] sm:max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 sm:px-4 text-[13px] leading-normal sm:text-sm sm:leading-relaxed transition-opacity duration-150 ${ASSISTANT_CLASSES} ${deliveryClasses}`}
      >
        <span className="sr-only">Assistant: </span>
        {message.content}
      </p>
    </div>
  );
}
