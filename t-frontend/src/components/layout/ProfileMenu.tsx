"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { LogoutIcon, MoonIcon, SettingsIcon, SunIcon } from "@/components/icons";

interface ProfileMenuProps {
  /** Anchors the panel beside the rail instead of above a full-width row. */
  expanded: boolean;
  onSelect: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

const ITEM_CLASSES =
  "flex w-full items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const NEUTRAL_ITEM = `${ITEM_CLASSES} text-text-primary hover:bg-text-primary hover:text-bg-primary dark:text-dark-text dark:hover:bg-dark-text dark:hover:text-dark-bg`;

const DANGER_ITEM = `${ITEM_CLASSES} text-error hover:bg-error hover:text-white dark:text-error-dark dark:hover:bg-error-dark dark:hover:text-dark-bg`;

/**
 * Actions for the signed-in account, opened from the three-dot trigger in the
 * sidebar's profile block. The theme switch lives here because the sidebar
 * header now carries the collapse control in its place.
 */
export default function ProfileMenu({
  expanded,
  onSelect,
  onLogout,
  loggingOut,
}: ProfileMenuProps) {
  const { theme, toggleTheme } = useTheme();
  const goingDark = theme === "light";

  return (
    <div
      role="menu"
      aria-label="Account actions"
      className={`absolute bottom-full z-50 mb-2 w-56 border border-border bg-bg-primary dark:border-dark-border dark:bg-dark-bg ${
        expanded ? "right-0" : "left-0"
      }`}
    >
      <Link href="/profile" role="menuitem" onClick={onSelect} className={NEUTRAL_ITEM}>
        <SettingsIcon className="h-4 w-4 shrink-0" />
        Profile Settings
      </Link>

      <button
        type="button"
        role="menuitem"
        onClick={toggleTheme}
        className={`${NEUTRAL_ITEM} border-t border-border dark:border-dark-border`}
      >
        {goingDark ? (
          <MoonIcon className="h-4 w-4 shrink-0" />
        ) : (
          <SunIcon className="h-4 w-4 shrink-0" />
        )}
        {goingDark ? "Dark Mode" : "Light Mode"}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={onLogout}
        disabled={loggingOut}
        className={`${DANGER_ITEM} border-t border-border dark:border-dark-border`}
      >
        <LogoutIcon className="h-4 w-4 shrink-0" />
        {loggingOut ? "Signing out" : "Log Out"}
      </button>
    </div>
  );
}
