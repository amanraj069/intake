"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDismissable } from "@/hooks/useDismissable";
import { displayName, initials } from "@/lib/userIdentity";
import { toErrorMessage } from "@/lib/errorMessage";
import { useToast } from "@/components/ui/Toast";
import Avatar from "@/components/ui/Avatar";
import { MoreIcon } from "@/components/icons";
import ProfileMenu from "./ProfileMenu";
import SidebarTooltip from "./SidebarTooltip";
import type { User } from "@/lib/api";

interface SidebarProfileProps {
  user: User;
  expanded: boolean;
}

const TRIGGER_CLASSES =
  "flex items-center justify-center p-2 cursor-pointer text-text-secondary transition-colors duration-150 hover:bg-black/5 hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-white/5 dark:hover:text-dark-text";

/**
 * The account block pinned to the foot of the sidebar. The avatar links
 * straight to the profile page, and every account action sits behind the
 * three-dot menu beside it.
 */
export default function SidebarProfile({ user, expanded }: SidebarProfileProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { open, toggle, close, containerRef } = useDismissable<HTMLDivElement>();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      close();
      router.replace("/login");
    } catch (error) {
      toast.error(toErrorMessage(error, "Could not sign you out. Please try again."));
      setLoggingOut(false);
    }
  }

  const avatar = <Avatar src={user.avatarUrl} initials={initials(user)} size="sm" />;

  const menuTrigger = (
    <button
      type="button"
      onClick={toggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Account actions"
      className={TRIGGER_CLASSES}
    >
      <MoreIcon className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={containerRef} className="relative border-t border-border p-3 dark:border-dark-border">
      {open && (
        <ProfileMenu
          expanded={expanded}
          onSelect={close}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      )}

      {expanded ? (
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="flex min-w-0 flex-1 items-center gap-3 p-1 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
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
        <div className="flex flex-col items-center gap-1">
          {menuTrigger}
          <div className="group/item relative">
            <Link
              href="/profile"
              aria-label="Profile"
              className="block p-1 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
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
