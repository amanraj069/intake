"use client";

import { type ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  icon?: ReactNode;
  description: string;
  /** Optional call to action, e.g. a link to the log-meal form. */
  action?: ReactNode;
  className?: string;
}

/** Shown when a request succeeded but matched nothing, which is not an error. */
export default function EmptyState({
  title,
  icon,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border dark:border-dark-border px-4 py-8 sm:px-8 sm:py-10 lg:py-12 text-center bg-bg-card dark:bg-dark-bg-card flex flex-col items-center justify-center min-h-[calc(100dvh-21.5rem)] min-h-[350px] sm:min-h-[430px] lg:min-h-[460px] ${className}`}
    >
      {icon && <div className="mb-3 sm:mb-4">{icon}</div>}
      {title && (
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-text-primary dark:text-white tracking-tight">
          {title}
        </h3>
      )}
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-text-secondary dark:text-dark-text-secondary max-w-xs sm:max-w-md lg:max-w-lg mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5 sm:mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
