"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDismissable } from "@/hooks/useDismissable";
import { displayName, initials } from "@/lib/userIdentity";
import { toErrorMessage } from "@/lib/errorMessage";
import { useToast } from "@/components/ui/Toast";
import "@theme-toggles/react/styles/classic.css";
import { Classic } from "@theme-toggles/react";
import Avatar from "@/components/ui/Avatar";
import { ChevronRightIcon, LogoutIcon, UserIcon } from "@/components/icons";
import SidebarTooltip from "./SidebarTooltip";
import type { User } from "@/lib/api";

interface SidebarProfileProps {
  user: User;
  expanded: boolean;
  onNavigate?: () => void;
}

/**
 * The account block pinned to the foot of the sidebar.
 * Clicking the chevron expands the account options upward directly within the sidebar.
 */
export default function SidebarProfile({ user, expanded, onNavigate }: SidebarProfileProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const goingDark = theme === "light";
  const router = useRouter();
  const toast = useToast();
  const { open, toggle, close, containerRef } = useDismissable<HTMLDivElement>();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      close();
      onNavigate?.();
      router.replace("/login");
    } catch (error) {
      toast.error(toErrorMessage(error, "Could not sign you out. Please try again."));
      setLoggingOut(false);
    }
  }

  const avatar = <Avatar src={user.avatarUrl} initials={initials(user)} size="sm" className="rounded-full" />;

  const menuTrigger = (
    <button
      type="button"
      onClick={toggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Account actions"
      title={open ? "Close menu" : "Account actions"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl cursor-pointer text-text-secondary hover:text-text-primary hover:bg-black/5 dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-white/10 transition-colors duration-150 active:scale-95"
    >
      <ChevronRightIcon
        className={`h-4 w-4 transform-gpu transition-transform duration-200 ease-out ${
          open
            ? "rotate-90 text-text-primary dark:text-dark-text"
            : "rotate-0 text-text-secondary dark:text-dark-text-secondary"
        }`}
      />
    </button>
  );

  return (
    <div ref={containerRef} className="relative border-t border-border dark:border-dark-border px-2.5 pt-2.5 pb-4 shrink-0">
      {/* Overlay window - appears like an overlay, strictly within the sidebar */}
      <div
        role="menu"
        aria-label="Account actions"
        className={`absolute bottom-[calc(100%+0.875rem)] left-2.5 right-2.5 z-50 rounded-2xl border border-border dark:border-dark-border bg-white dark:bg-[#16211A] p-1.5 shadow-xl shadow-black/10 dark:shadow-2xl dark:shadow-black/70 transform-gpu transition-all duration-200 ease-out origin-bottom ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        } ${expanded ? "space-y-0.5" : "flex flex-col items-center gap-1"}`}
      >
        {/* Profile Item */}
        <div className={expanded ? "w-full" : "group/item relative"}>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => {
              close();
              onNavigate?.();
            }}
            title={expanded ? undefined : "Profile"}
            className={`group/btn flex items-center rounded-xl text-sm font-medium text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-150 cursor-pointer ${
              expanded ? "gap-3 px-3.5 py-2.5 w-full" : "justify-center h-10 w-10 p-0"
            }`}
          >
            <UserIcon className="w-5 h-5 shrink-0 text-text-secondary group-hover/btn:text-text-primary dark:text-dark-text-secondary dark:group-hover/btn:text-dark-text transition-colors" />
            {expanded && <span className="truncate">Profile</span>}
          </Link>
          {!expanded && <SidebarTooltip>Profile</SidebarTooltip>}
        </div>

        {/* Theme Item */}
        <div className={expanded ? "w-full" : "group/item relative"}>
          <div
            role="menuitem"
            tabIndex={0}
            onClick={toggleTheme}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTheme();
              }
            }}
            title={expanded ? undefined : "Switch mode"}
            className={`group/btn flex items-center rounded-xl text-sm font-medium text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-left select-none ${
              expanded ? "gap-3 px-3.5 py-2.5 w-full" : "justify-center h-10 w-10 p-0"
            }`}
          >
            <div
              className="w-5 h-5 shrink-0 flex items-center justify-center text-text-secondary group-hover/btn:text-text-primary dark:text-dark-text-secondary dark:group-hover/btn:text-dark-text transition-colors"
              suppressHydrationWarning
            >
              <Classic
                duration={750}
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none text-current"
                style={{ fontSize: "1.25rem" }}
              />
            </div>
            {expanded && <span className="truncate">Switch mode</span>}
          </div>
          {!expanded && <SidebarTooltip>Switch mode</SidebarTooltip>}
        </div>

        {/* Divider */}
        <div className={`h-px bg-border/80 dark:bg-dark-border/80 my-1 ${expanded ? "mx-2" : "w-6"}`} />

        {/* Logout Item */}
        <div className={expanded ? "w-full" : "group/item relative"}>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            title={expanded ? undefined : "Log Out"}
            className={`group/btn flex items-center rounded-xl text-sm font-medium text-error/90 dark:text-error-dark/90 hover:text-error dark:hover:text-error-dark hover:bg-red-500/10 dark:hover:bg-red-500/15 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 text-left ${
              expanded ? "gap-3 px-3.5 py-2.5 w-full" : "justify-center h-10 w-10 p-0"
            }`}
          >
            <LogoutIcon className="w-5 h-5 shrink-0 text-error/85 group-hover/btn:text-error dark:text-error-dark/85 dark:group-hover/btn:text-error-dark transition-colors" />
            {expanded && <span className="truncate">{loggingOut ? "Signing out..." : "Log Out"}</span>}
          </button>
          {!expanded && <SidebarTooltip>Log Out</SidebarTooltip>}
        </div>
      </div>

      {/* User profile row */}
      {expanded ? (
        <div className="flex items-center gap-1.5 p-1 rounded-xl">
          <Link
            href="/profile"
            onClick={() => {
              close();
              onNavigate?.();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 p-1 rounded-lg transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {avatar}
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-bold text-text-primary dark:text-dark-text">
                {displayName(user)}
              </span>
              <span className="block truncate text-[10px] font-light text-text-secondary dark:text-dark-text-secondary">
                {user.email}
              </span>
            </span>
          </Link>
          {menuTrigger}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {menuTrigger}
          <div className="group/item relative">
            <Link
              href="/profile"
              aria-label="Profile"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              className="block p-1 rounded-xl transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
            >
              {avatar}
            </Link>
            <SidebarTooltip>Profile</SidebarTooltip>
          </div>
        </div>
      )}
    </div>
  );
}
