"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { MenuIcon } from "@/components/icons";
import NotificationDot from "@/components/ui/NotificationDot";
import { useUnseenShares } from "@/contexts/UnseenSharesContext";
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
  const { unseenCount } = useUnseenShares();

  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between gap-4 px-4 border-b border-border dark:border-dark-border bg-bg-primary/95 dark:bg-dark-bg/95 backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        className="p-2 -ml-2 text-text-primary dark:text-dark-text hover:text-accent dark:hover:text-accent-dark active:scale-90 transition-all duration-150 cursor-pointer"
      >
        <span className="relative block">
          <MenuIcon className="w-5 h-5" />
          {unseenCount > 0 && (
            <NotificationDot label="New shared meals" className="absolute -top-0.5 -right-0.5 ring-2 ring-bg-primary dark:ring-dark-bg" />
          )}
        </span>
      </button>

      <BrandMark className="text-lg tracking-tight" onNavigate={onNavigate} />
      <ThemeToggle />
    </header>
  );
}
