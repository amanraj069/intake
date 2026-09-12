"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import Navbar from "./Navbar";

interface PageShellProps {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}

/** Shared chrome for the signed-in pages: fixed nav, back link, stark page title. */
export default function PageShell({
  title,
  description,
  backHref,
  backLabel,
  children,
}: PageShellProps) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-bg-primary dark:bg-dark-bg selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 space-y-12">
          <div className="flex flex-col gap-6">
            <Link
              href={backHref}
              className="text-xs font-bold tracking-widest uppercase text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text transition-colors flex items-center gap-2 w-fit"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                aria-hidden="true"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>

            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-text-primary dark:text-dark-text">
                {title}
              </h1>
              {description && (
                <p className="mt-3 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
                  {description}
                </p>
              )}
            </div>
          </div>

          {children}
        </div>
      </div>
    </>
  );
}
