"use client";

import type { ReactNode } from "react";

interface DetailSectionProps {
  title: string;
  description?: string;
  /** Sits opposite the title, e.g. a count. */
  aside?: ReactNode;
  children: ReactNode;
}

/** One titled card on a detail page, with the panel header style the dashboard uses. */
export default function DetailSection({ title, description, aside, children }: DetailSectionProps) {
  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm">
      <header className="flex items-end justify-between gap-4 border-b border-border dark:border-dark-border px-4 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-text-primary dark:text-dark-text">{title}</h2>
          {description && (
            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">
              {description}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className="p-4 sm:p-7">{children}</div>
    </section>
  );
}
