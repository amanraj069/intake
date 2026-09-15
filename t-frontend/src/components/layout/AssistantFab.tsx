"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssistantIcon } from "@/components/icons";

const ASSISTANT_HREF = "/chat";

/**
 * Floating quick-launch into the assistant, present on every signed-in page.
 * Hidden on the assistant's own page, where it would just float over the
 * thing it links to.
 */
export default function AssistantFab() {
  const pathname = usePathname();
  const onAssistantPage = pathname === ASSISTANT_HREF || pathname.startsWith(`${ASSISTANT_HREF}/`);

  if (onAssistantPage) return null;

  return (
    <div className="group/fab fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-30">
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-black/10 bg-text-primary px-3 py-2 text-[10px] font-bold text-bg-primary opacity-0 shadow-md transition-opacity duration-150 group-hover/fab:opacity-100 dark:border-white/15 dark:bg-[#1A1A1A] dark:text-white"
      >
        Ask the assistant
      </span>

      <Link
        href={ASSISTANT_HREF}
        aria-label="Ask the assistant"
        className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent-muted dark:bg-accent-dark-muted text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(0,0,0,0.45)] hover:bg-accent-muted-hover dark:hover:bg-accent-dark-muted-hover active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <AssistantIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </Link>
    </div>
  );
}
