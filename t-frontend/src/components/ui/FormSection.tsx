"use client";

import { type ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled block separated by a hairline rule rather than a background change. */
export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-6">
      <div className="pb-4 border-b border-black/10 dark:border-white/10">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
