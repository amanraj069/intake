"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import BrandMark from "./layout/BrandMark";
import ThemeToggle from "./ThemeToggle";

const LINK_CLASSES =
  "text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors";

const ACCENT_LINK_CLASSES =
  "text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent dark:text-accent-dark hover:text-accent-hover dark:hover:text-red-400 transition-colors";

function GuestLinks({ pathname }: { pathname: string }) {
  if (pathname !== "/") {
    return (
      <Link href="/" className={LINK_CLASSES}>
        Home
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className={LINK_CLASSES}>
        Sign In
      </Link>
      <Link href="/signup" className={ACCENT_LINK_CLASSES}>
        Create Account
      </Link>
    </>
  );
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/10 dark:border-white/10 bg-bg-primary/90 dark:bg-dark-bg/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <BrandMark size="sm" className="text-sm text-text-primary dark:text-dark-text" />

        <div className="flex items-center gap-6">
          <ThemeToggle />

          {!loading && (
            <div className="flex items-center gap-6">
              {user ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-5 py-2.5 bg-accent text-white hover:bg-accent-hover dark:bg-accent-dark dark:hover:bg-accent-dark-hover transition-all duration-150 active:scale-[0.97]"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="text-text-primary dark:text-dark-text hover:text-error dark:hover:text-error-dark transition-colors cursor-pointer"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-5 h-5"
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="square" 
                      strokeLinejoin="miter"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </button>
                </>
              ) : (
                <GuestLinks pathname={pathname} />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
