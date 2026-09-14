"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

interface QuickAction {
  href: string;
  label: string;
  description: string;
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    href: "/meals",
    label: "Browse meals",
    description: "Every entry, filtered by day and meal.",
  },
  {
    href: "/goals",
    label: "Adjust goals",
    description: "Change the targets today is measured against.",
  },
];

/** Where to go next from the overview, as two stark cells rather than buttons. */
export default function DashboardQuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid gap-3 sm:gap-6 sm:grid-cols-2">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center justify-between gap-4 p-4 sm:p-6 sm:px-7 bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="min-w-0">
            <span className="block text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text transition-colors">
              {action.label}
            </span>
            <span className="mt-1 sm:mt-2 block text-[11px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary truncate sm:whitespace-normal">
              {action.description}
            </span>
          </span>

          <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary dark:group-hover:text-dark-text" />
        </Link>
      ))}
    </nav>
  );
}
