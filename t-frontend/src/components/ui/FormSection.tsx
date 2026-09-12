"use client";

import { type ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** A titled block separated by a hairline rule rather than a background change. */
export default function FormSection({ title, description, action, children }: FormSectionProps) {
  return (
    <section className="space-y-6">
      <div className="pb-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold   text-text-secondary dark:text-dark-text-secondary">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}
