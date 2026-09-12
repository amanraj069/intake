"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarExpansion } from "@/hooks/useSidebarExpansion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import MobileTopBar from "./MobileTopBar";
import SidebarHeader from "./SidebarHeader";
import SidebarNav from "./SidebarNav";
import SidebarProfile from "./SidebarProfile";

interface DashboardLayoutProps {
  children: ReactNode;
}

const TOGGLE_BUTTON_CLASSES =
  "flex h-7 w-7 items-center justify-center border border-transparent cursor-pointer text-text-secondary transition-colors duration-150 hover:border-border hover:text-text-primary dark:text-dark-text-secondary dark:hover:border-dark-border dark:hover:text-dark-text";

/**
 * Shell for every signed-in page. The sidebar is permanent from `lg` up, where
 * it can be retracted to an icon rail, and slides in over the content below
 * that, where a fixed 16rem column would leave nothing for the page itself.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const { expanded, hydrated, toggle } = useSidebarExpansion();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-bg-primary dark:bg-dark-bg text-text-primary dark:text-dark-text">
      <MobileTopBar
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onNavigate={closeDrawer}
      />

      <button
        type="button"
        aria-label="Close navigation"
        onClick={closeDrawer}
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 dark:bg-black/60 cursor-default transition-opacity duration-300 ease-[cubic-bezier(0.2,1,0.2,1)] ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg max-lg:w-64 lg:translate-x-0 ${
          expanded ? "lg:w-64" : "lg:w-16"
        } ${drawerOpen ? "translate-x-0" : "-translate-x-full"} ${
          hydrated ? "transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,1,0.2,1)]" : ""
        }`}
      >
        <SidebarHeader
          expanded={expanded || drawerOpen}
          onCloseDrawer={closeDrawer}
        />

        {/* Dashboard label with collapse/expand toggle */}
        {expanded ? (
          <div className="px-5 pt-8 pb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold uppercase tracking-[0.15em]">Dashboard</h2>
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={`hidden lg:flex ${TOGGLE_BUTTON_CLASSES}`}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-4 pb-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className={`hidden lg:flex ${TOGGLE_BUTTON_CLASSES}`}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <SidebarNav expanded={expanded || drawerOpen} onNavigate={closeDrawer} />

        {user && <SidebarProfile user={user} expanded={expanded || drawerOpen} />}
      </aside>

      <main
        className={`pt-14 lg:pt-0 min-h-screen ${expanded ? "lg:ml-64" : "lg:ml-16"} ${
          hydrated ? "transition-[margin] duration-300 ease-[cubic-bezier(0.2,1,0.2,1)]" : ""
        }`}
      >
        <div className="px-4 py-8 sm:px-8 lg:p-12">{children}</div>
      </main>
    </div>
  );
}
