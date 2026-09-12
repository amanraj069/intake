"use client";

import { type ReactNode } from "react";

interface SettingsPanelProps {
  title: string;
  children: ReactNode;
}

/**
 * The bordered column that holds one settings section. Blocks inside it are
 * separated by hairlines rather than by a change of background.
 */
export default function SettingsPanel({ title, children }: SettingsPanelProps) {
  return (
    <section className="border border-border dark:border-dark-border">
      <header className="border-b border-border px-6 py-5 dark:border-dark-border sm:px-8">
        <h2 className="text-xs font-bold   text-text-primary dark:text-dark-text">
          {title}
        </h2>
      </header>

      <div className="divide-y divide-black/10 px-6 dark:divide-white/10 sm:px-8">{children}</div>
    </section>
  );
}
