import { type ReactNode } from "react";

/**
 * Label that appears beside a collapsed sidebar item on hover. Its parent must
 * carry `group/item relative`; hover is driven by CSS so no JS runs per item.
 */
export default function SidebarTooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-black/10 bg-text-primary px-3 py-2 text-[10px] font-bold text-bg-primary opacity-0 transition-opacity duration-100 group-hover/item:opacity-100 dark:border-white/15 dark:bg-[#1A1A1A] dark:text-white shadow-md"
    >
      {children}
    </span>
  );
}
