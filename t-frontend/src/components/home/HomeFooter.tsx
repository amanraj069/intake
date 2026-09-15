"use client";

import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";
import { useAuth } from "@/contexts/AuthContext";

const PRODUCT_LINKS = [
  { href: "/log-meal", label: "Log a meal" },
  { href: "/chat", label: "Assistant" },
  { href: "/reports", label: "Reports" },
] as const;

function FooterBrand() {
  return (
    <div className="max-w-sm">
      <BrandMark className="text-base sm:text-xl tracking-tight text-text-primary dark:text-dark-text" />
      <p className="mt-1.5 sm:mt-4 text-[11px] sm:text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
        Calories, macros, and micronutrients from a photo, a sentence, or a diary. Measured against goals built for you.
      </p>
    </div>
  );
}

function AccountColumn() {
  const { user, loading, logout } = useAuth();

  return (
    <nav aria-label="Account">
      <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">Account</p>
      <ul className="mt-1.5 sm:mt-4 space-y-1.5 sm:space-y-3">
        {!loading && user ? (
          <>
            <li>
              <Link
                href="/profile"
                className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text"
              >
                Profile
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text cursor-pointer text-left"
              >
                Log out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                href="/signup"
                className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text"
              >
                Create account
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text"
              >
                Sign in
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default function HomeFooter() {
  return (
    <footer className="w-full border-t border-border dark:border-dark-border bg-[#FAF7F2] dark:bg-[#0D1611]">
      {/* Main footer content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-5 sm:py-16">
        <div className="flex flex-col gap-4 sm:gap-10 md:flex-row md:justify-between">
          <FooterBrand />
          <div className="grid grid-cols-2 gap-6 sm:gap-20">
            <nav aria-label="Product">
              <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">Product</p>
              <ul className="mt-1.5 sm:mt-4 space-y-1.5 sm:space-y-3">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <AccountColumn />
          </div>
        </div>
      </div>

      {/* Full-width ending bar & copyright row */}
      <div className="w-full border-t border-border/70 dark:border-dark-border/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-3 sm:py-6 flex flex-row items-center justify-between gap-3">
          <p className="text-[10px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">
            © {new Date().getFullYear()} Intake. All rights reserved.
          </p>
          <a
            href="#top"
            className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary transition-colors hover:text-text-primary dark:hover:text-dark-text"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
