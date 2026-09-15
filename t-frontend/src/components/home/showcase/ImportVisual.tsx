"use client";

import Badge from "@/components/ui/Badge";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const IMPORTED_ROWS = [
  { item: "Oats with banana", status: "Ready", variant: "success" },
  { item: "Chicken biryani", status: "Estimated", variant: "warning" },
  { item: "Greek yogurt", status: "Duplicate", variant: "neutral" },
] as const;

const ROW_STAGGER_MS = 100;

export default function ImportVisual() {
  const { ref, isVisible } = useInViewOnce<HTMLUListElement>();

  return (
    <ul ref={ref} className="space-y-1 sm:space-y-2">
      {IMPORTED_ROWS.map((row, index) => (
        <li
          key={row.item}
          className={`flex items-center justify-between gap-2 rounded-lg sm:rounded-xl bg-bg-app dark:bg-dark-bg-app px-2.5 py-1.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm transition-all duration-400 ease-out ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1.5"
          }`}
          style={{ transitionDelay: `${index * ROW_STAGGER_MS}ms` }}
        >
          <span className="truncate text-text-primary dark:text-dark-text">{row.item}</span>
          <Badge variant={row.variant}>{row.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
