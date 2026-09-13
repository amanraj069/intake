"use client";

import { type ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Optional call to action, e.g. a link to the log-meal form. */
  action?: ReactNode;
}

/** Shown when a request succeeded but matched nothing, which is not an error. */
export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border dark:border-dark-border px-6 py-16 text-center bg-bg-card dark:bg-dark-bg-card">
      <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
        {title}
      </p>
      <p className="mt-3 text-sm font-light text-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
        {description}
      </p>
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </div>
  );
}
