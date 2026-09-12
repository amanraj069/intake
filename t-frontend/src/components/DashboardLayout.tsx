"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-bg-primary dark:bg-dark-bg text-text-primary dark:text-dark-text">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border dark:border-dark-border flex flex-col fixed inset-y-0 left-0 bg-bg-primary dark:bg-dark-bg z-40">
        
        {/* Top Section: INTAKE Logo & Theme Toggle */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border dark:border-dark-border">
          <Link href="/" className="flex items-center gap-3 text-base font-extrabold tracking-[0.2em] uppercase hover:text-accent dark:hover:text-accent-dark transition-colors">
            <img src="/icon/intake-l.png" alt="Intake Logo" className="w-7 h-7 object-contain block dark:hidden" />
            <img src="/icon/intake-d.png" alt="Intake Logo" className="w-7 h-7 object-contain hidden dark:block" />
            INTAKE
          </Link>
          <div className="scale-125 origin-right">
            <ThemeToggle />
          </div>
        </div>

        {/* Second Section: Dashboard Header */}
        <div className="px-6 pt-8 pb-4">
          <h2 className="text-base font-extrabold uppercase tracking-[0.15em] text-text-primary dark:text-dark-text">
            DASHBOARD
          </h2>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1 py-2">
          <Link
            href="/dashboard"
            className={`px-5 py-3 text-sm transition-colors border-l-[3px] ${
              pathname === "/dashboard" 
                ? "bg-accent/5 dark:bg-accent-dark/10 text-accent dark:text-accent-dark font-bold border-accent dark:border-accent-dark" 
                : "text-text-secondary dark:text-dark-text-secondary font-medium hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-dark-text border-transparent"
            }`}
          >
            Overview
          </Link>
          <Link
            href="/goals"
            className={`px-5 py-3 text-sm transition-colors border-l-[3px] ${
              pathname === "/goals" 
                ? "bg-accent/5 dark:bg-accent-dark/10 text-accent dark:text-accent-dark font-bold border-accent dark:border-accent-dark" 
                : "text-text-secondary dark:text-dark-text-secondary font-medium hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-dark-text border-transparent"
            }`}
          >
            Goals
          </Link>
          <Link
            href="/log-meal"
            className={`px-5 py-3 text-sm transition-colors border-l-[3px] ${
              pathname === "/log-meal" 
                ? "bg-accent/5 dark:bg-accent-dark/10 text-accent dark:text-accent-dark font-bold border-accent dark:border-accent-dark" 
                : "text-text-secondary dark:text-dark-text-secondary font-medium hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-dark-text border-transparent"
            }`}
          >
            Log Meal
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="px-4 pb-4">
          <button
            onClick={logout}
            className="group w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-error bg-error/10 hover:bg-error/15 dark:bg-error-dark/10 dark:hover:bg-error-dark/20 transition-all duration-200 active:scale-[0.98]"
          >
            Log out
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-4 h-4 transform transition-transform duration-200 group-hover:translate-x-1"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="square" 
              strokeLinejoin="miter"
              viewBox="0 0 24 24"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Bottom Section: Profile Block */}
        {user && (
          <div className="p-4 border-t border-border dark:border-dark-border">
            <Link 
              href="/profile"
              className="flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-xs uppercase shrink-0">
                {user.email.substring(0, 2)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">
                  {user.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen bg-bg-primary dark:bg-dark-bg">
        <div className="flex-1 p-8 sm:p-12 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
