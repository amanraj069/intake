"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { MenuIcon } from "@/components/icons";
import BrandMark from "./BrandMark";

interface MobileTopBarProps {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onNavigate: () => void;
}

/** Summons the sidebar drawer on the screens too narrow to keep it permanent. */
export default function MobileTopBar({
  drawerOpen,
  onOpenDrawer,
  onNavigate,
}: MobileTopBarProps) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between gap-4 px-4 border-b border-border dark:border-dark-border bg-bg-primary/95 dark:bg-dark-bg/95 backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        className="p-2 -ml-2 text-text-primary dark:text-dark-text hover:text-accent dark:hover:text-accent-dark transition-colors cursor-pointer"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      <BrandMark className="text-sm" onNavigate={onNavigate} />
      <ThemeToggle />
    </header>
  );
}
