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
  /** Hands the page the whole viewport, unpadded, for screens that manage their own scrolling (e.g. chat). */
  fullHeight?: boolean;
}

const TOGGLE_BUTTON_CLASSES =
  "flex h-7 w-7 items-center justify-center border border-transparent cursor-pointer text-text-secondary transition-colors duration-150 hover:border-border hover:text-text-primary dark:text-dark-text-secondary dark:hover:border-dark-border dark:hover:text-dark-text";

/**
 * Shell for every signed-in page. The sidebar is permanent from `lg` up, where
 * it can be retracted to an icon rail, and slides in over the content below
 * that, where a fixed 16rem column would leave nothing for the page itself.
 */
export default function DashboardLayout({ children, fullHeight = false }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const { expanded, hydrated, toggle } = useSidebarExpansion();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (loading) return null;

  return (
    <div
      className={`${
        fullHeight ? "h-dvh overflow-hidden" : "min-h-dvh"
      } bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text`}
    >
      <MobileTopBar
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onNavigate={closeDrawer}
      />

      <button
        type="button"
        aria-label="Close navigation"
        onClick={closeDrawer}
        className={`lg:hidden fixed inset-0 z-40 bg-black/35 dark:bg-black/50 backdrop-blur-[2px] cursor-default transition-opacity duration-300 ease-out ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card max-lg:w-72 max-lg:shadow-[4px_0_24px_rgba(0,0,0,0.15)] dark:max-lg:shadow-[4px_0_30px_rgba(0,0,0,0.6)] lg:translate-x-0 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          expanded ? "lg:w-64" : "lg:w-16"
        } ${drawerOpen ? "translate-x-0" : "-translate-x-full"} ${
          hydrated ? "lg:transition-[width,transform]" : ""
        }`}
      >
        <SidebarHeader
          expanded={expanded || drawerOpen}
          onCloseDrawer={closeDrawer}
        />

        {/* Dashboard label with collapse/expand toggle */}
        {expanded ? (
          <div className="px-5 pt-8 pb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold  ">Dashboard</h2>
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

        {user && (
          <SidebarProfile
            user={user}
            expanded={expanded || drawerOpen}
            onNavigate={closeDrawer}
          />
        )}
      </aside>

      <main
        className={`${
          fullHeight
            ? "h-dvh pt-14 lg:pt-0 flex flex-col overflow-hidden"
            : "pt-14 lg:pt-0 min-h-dvh"
        } ${expanded ? "lg:ml-64" : "lg:ml-16"} ${
          hydrated ? "transition-[margin] duration-300 ease-[cubic-bezier(0.2,1,0.2,1)]" : ""
        }`}
      >
        {fullHeight ? (
          <div className="flex-1 min-h-0 h-full overflow-hidden">{children}</div>
        ) : (
          <div className="px-4 py-5 sm:px-8 sm:py-8 lg:p-12">
            <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-12 pb-24">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
