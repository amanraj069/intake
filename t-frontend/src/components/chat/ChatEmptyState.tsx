"use client";

import { AssistantIcon, ChevronRightIcon, GoalsIcon, LogMealIcon, ReportsIcon, SparkleIcon } from "@/components/icons";

interface ChatEmptyStateProps {
  onPickPrompt: (prompt: string) => void;
}

const CAPABILITIES = [
  {
    label: "Log a meal",
    description: "Track food, drinks, or recipes",
    prompt: "For breakfast I had ",
    icon: LogMealIcon,
  },
  {
    label: "Today's progress",
    description: "Check calories & macro goals",
    prompt: "How am I doing today against my goal?",
    icon: GoalsIcon,
  },
  {
    label: "Weekly summary",
    description: "Last 7 days & goal progress",
    prompt: "Give me a summary of my last 7 days and how I'm tracking towards my goal.",
    icon: ReportsIcon,
  },
  {
    label: "Nutrition advice",
    description: "Meals to fulfill your daily intake",
    prompt: "What meals do I need to eat to fulfill my daily nutrient intake?",
    icon: SparkleIcon,
  },
];

export default function ChatEmptyState({ onPickPrompt }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-4 sm:py-8 text-center">
      <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-bg-card dark:bg-dark-bg-card text-accent dark:text-accent-dark shadow-2xs">
        <AssistantIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <h2 className="mt-3 sm:mt-4 text-lg sm:text-2xl font-extrabold text-text-primary dark:text-dark-text">How can I help?</h2>
      <p className="mt-1.5 sm:mt-2 max-w-xs sm:max-w-sm text-xs sm:text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
        Log a meal in your own words, check how today is going, or ask a nutrition question.
      </p>

      <div className="mt-5 sm:mt-8 grid w-full max-w-2xl grid-cols-2 gap-2 sm:gap-3.5 text-left">
        {CAPABILITIES.map(({ label, description, prompt, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onPickPrompt(prompt)}
            className="group flex items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-border dark:border-dark-border bg-bg-card/80 dark:bg-dark-bg-card/80 backdrop-blur-xs px-2.5 py-2.5 sm:pl-6 sm:pr-4 sm:py-3.5 cursor-pointer transition-all duration-200 ease-out hover:scale-[1.025] hover:shadow-md hover:border-accent/40 dark:hover:border-accent-dark/40 active:scale-[0.98]"
          >
            <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6 shrink-0 text-accent dark:text-accent-dark transition-[filter] duration-300 group-hover-shimmer group-hover:animate-icon-shimmer" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] sm:text-sm font-semibold sm:font-bold text-text-primary dark:text-dark-text leading-tight sm:truncate">
                {label}
              </span>
              <span className="hidden sm:block mt-0.5 text-xs text-text-secondary dark:text-dark-text-secondary truncate">
                {description}
              </span>
            </span>
            <ChevronRightIcon className="hidden sm:block h-4 w-4 shrink-0 text-text-secondary/40 dark:text-dark-text-secondary/40 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </div>
  );
}


