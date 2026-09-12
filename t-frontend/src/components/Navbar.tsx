"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/10 dark:border-white/10 bg-bg-primary/90 dark:bg-dark-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-[0.2em] text-text-primary dark:text-dark-text hover:text-accent dark:hover:text-accent-dark transition-colors"
        >
          INTAKE
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4 sm:gap-6">
          <ThemeToggle />

          {!loading && (
            <div className="flex items-center gap-4 sm:gap-6">
              {user ? (
                <>
                  {pathname !== "/profile" && (
                    <Link
                      href="/profile"
                      className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary hover:text-accent dark:hover:text-accent-dark transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {pathname !== "/" ? (
                    <Link
                      href="/"
                      className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
                    >
                      Home
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent dark:text-accent-dark hover:text-accent-hover dark:hover:text-red-400 transition-colors"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
