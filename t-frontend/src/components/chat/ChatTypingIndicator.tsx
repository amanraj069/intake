"use client";

import AiAvatar from "./AiAvatar";

/** Stands in for the assistant's reply while it is being produced. */
export default function ChatTypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-2.5" role="status" aria-label="Assistant is replying">
      <AiAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-bg-card dark:bg-dark-bg-card border border-border dark:border-dark-border/50 px-4 py-3.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-text-secondary dark:bg-dark-text-secondary animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
