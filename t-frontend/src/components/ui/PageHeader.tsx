"use client";

import { type ReactNode } from "react";
import BackButton from "./BackButton";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Shown when the page is a detail view the user navigated into. */
  showBackButton?: boolean;
  /** Page-level action, e.g. a "Log Meal" link on the list view. */
  action?: ReactNode;
}

/** The stark title block every signed-in page opens with. */
export default function PageHeader({
  title,
  description,
  showBackButton = false,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-4">
          {showBackButton && <BackButton size="md" className="-ml-2" />}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter uppercase text-text-primary dark:text-dark-text">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-3 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
