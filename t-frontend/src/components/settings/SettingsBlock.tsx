"use client";

import { type ReactNode } from "react";

interface SettingsBlockProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/** One setting inside a panel: a stark label, its explanation, then its controls. */
export default function SettingsBlock({ title, description, children }: SettingsBlockProps) {
  return (
    <div className="space-y-5 py-8">
      <div>
        <h3 className="text-[11px] font-bold   text-text-primary dark:text-dark-text">
          {title}
        </h3>
        <p className="mt-2 text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
