"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { CloseIcon } from "@/components/icons";

interface SidebarHeaderProps {
  expanded: boolean;
  onCloseDrawer: () => void;
}

const ICON_BUTTON_CLASSES =
  "flex h-9 w-9 items-center justify-center border border-transparent cursor-pointer text-text-secondary transition-colors duration-150 hover:border-border hover:text-text-primary dark:text-dark-text-secondary dark:hover:border-dark-border dark:hover:text-dark-text";

/**
 * The sidebar's top row. When expanded it shows the full wordmark with theme
 * toggle; when contracted it shows just the logo icon centered.
 */
export default function SidebarHeader({
  expanded,
  onCloseDrawer,
}: SidebarHeaderProps) {
  return (
    <div
      className={`h-14 lg:h-16 flex items-center border-b border-border dark:border-dark-border ${
        expanded ? "justify-between px-5" : "justify-center px-0"
      }`}
    >
      {expanded ? (
        <>
          <Link
            href="/"
            onClick={onCloseDrawer}
            className="flex items-center gap-3 font-extrabold tracking-[0.2em] uppercase hover:text-accent dark:hover:text-accent-dark transition-colors text-base"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/intake-l.png"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 object-contain block dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/intake-d.png"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 object-contain hidden dark:block"
            />
            INTAKE
          </Link>

          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label="Close navigation"
            className={`lg:hidden ${ICON_BUTTON_CLASSES}`}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </>
      ) : (
        <Link
          href="/"
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon/intake-l.png"
            alt="INTAKE"
            className="w-7 h-7 object-contain block dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon/intake-d.png"
            alt="INTAKE"
            className="w-7 h-7 object-contain hidden dark:block"
          />
        </Link>
      )}
    </div>
  );
}
