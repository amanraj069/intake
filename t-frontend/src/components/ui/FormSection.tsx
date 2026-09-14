"use client";

import { type ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** When true, locks the action strictly to the same horizontal level as the title. */
  alignActionWithTitle?: boolean;
  /** Optional: a section can be just a heading with its action, such as a choice of pills. */
  children?: ReactNode;
}

/** A titled block separated by a hairline rule rather than a background change. */
export default function FormSection({
  title,
  description,
  action,
  alignActionWithTitle = false,
  children,
}: FormSectionProps) {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="pb-3.5 sm:pb-4 border-b border-black/10 dark:border-white/10">
        {alignActionWithTitle ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
                {title}
              </h2>
              {action && <div className="shrink-0">{action}</div>}
            </div>
            {description && (
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
                {description}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
                {title}
              </h2>
              {description && (
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0">{action}</div>}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
