"use client";

import Link from "next/link";

interface BrandMarkProps {
  className?: string;
  /** Smaller icon for the marketing navbar, where the row is only 3.5rem tall. */
  size?: "sm" | "md";
  onNavigate?: () => void;
}

const ICON_SIZES = {
  sm: "w-6 h-6",
  md: "w-7 h-7",
} as const;

/** The wordmark and its light/dark icon pair, used by every header in the app. */
export default function BrandMark({ className = "", size = "md", onNavigate }: BrandMarkProps) {
  const iconSize = ICON_SIZES[size];

  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={`flex items-center gap-1.5 font-extrabold   hover:text-accent dark:hover:text-accent-dark transition-colors ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 28px mark gains nothing from next/image's resizing pipeline */}
      <img
        src="/icon/intake-l.png"
        alt=""
        aria-hidden="true"
        className={`${iconSize} object-contain block dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
      <img
        src="/icon/intake-d.png"
        alt=""
        aria-hidden="true"
        className={`${iconSize} object-contain hidden dark:block`}
      />
      Intake
    </Link>
  );
}
