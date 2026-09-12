"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "./navItems";
import SidebarTooltip from "./SidebarTooltip";

const BASE_LINK_CLASSES =
  "flex items-center h-12 text-sm transition-all duration-150 border-l-[3px] active:scale-[0.98]";

const ACTIVE_LINK_CLASSES =
  "bg-accent/5 dark:bg-accent-dark/10 text-accent dark:text-accent-dark font-bold border-accent dark:border-accent-dark";

const INACTIVE_LINK_CLASSES =
  "text-text-secondary dark:text-dark-text-secondary font-medium border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-dark-text";

interface SidebarNavProps {
  /** When false the rail shows icons only, with the label moved to a hover tooltip. */
  expanded: boolean;
  /** Lets the mobile drawer close itself when a link inside it is followed. */
  onNavigate: () => void;
}

/** The sidebar's primary navigation, marking the section the user is in. */
export default function SidebarNav({ expanded, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex-1 flex flex-col gap-1 py-2">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item, pathname);
        const { Icon } = item;

        return (
          <div key={item.href} className="group/item relative">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              title={expanded ? undefined : item.label}
              className={`${BASE_LINK_CLASSES} ${expanded ? "gap-3 px-5" : "justify-center px-0"} ${
                active ? ACTIVE_LINK_CLASSES : INACTIVE_LINK_CLASSES
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>

            {!expanded && <SidebarTooltip>{item.label}</SidebarTooltip>}
          </div>
        );
      })}
    </nav>
  );
}
