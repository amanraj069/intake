"use client";

import Button from "@/components/ui/Button";
import { AssistantIcon } from "@/components/icons";

interface ChatEmptyStateProps {
  onPickPrompt: (prompt: string) => void;
}

/** Each chip fills the composer rather than sending, so the prompt can be finished or adjusted first. */
const EXAMPLE_PROMPTS = [
  { label: "Log a meal", prompt: "For breakfast I had " },
  { label: "Today's progress", prompt: "How am I doing today against my goal?" },
  { label: "Weekly summary", prompt: "Give me a summary of my last 7 days." },
  { label: "Nutrition advice", prompt: "How much protein should I eat a day?" },
];

export default function ChatEmptyState({ onPickPrompt }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-card dark:bg-dark-bg-card text-accent dark:text-accent-dark">
        <AssistantIcon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-text-primary dark:text-dark-text">How can I help?</h2>
      <p className="mt-2 max-w-sm text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
        Log a meal in your own words, check how today is going, or ask a nutrition question.
      </p>
      <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map(({ label, prompt }) => (
          <Button
            key={label}
            size="sm"
            variant="secondary"
            className="rounded-full hover:-translate-y-px"
            onClick={() => onPickPrompt(prompt)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
