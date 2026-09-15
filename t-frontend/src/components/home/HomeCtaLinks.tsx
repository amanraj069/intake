"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { buttonClassName } from "@/components/ui/Button";
import { homeRouteFor } from "@/lib/postAuthRoute";

interface HomeCtaLinksProps {
  /** "accent" when the links sit on the green closing band rather than a neutral surface. */
  tone?: "surface" | "accent";
  className?: string;
}

const TONE_VARIANTS = {
  surface: { primary: "primary", secondary: "secondary" },
  accent: { primary: "inverse", secondary: "inverseOutline" },
} as const;

/**
 * The primary calls to action, shared by the hero and the closing band. A
 * signed-in visitor gets a single link back into the app instead of signup.
 */
export default function HomeCtaLinks({ tone = "surface", className = "" }: HomeCtaLinksProps) {
  const { user, loading } = useAuth();
  const variants = TONE_VARIANTS[tone];

  if (loading) {
    return <div className={`h-9 sm:h-[52px] ${className}`} aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className={`flex flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto ${className}`}>
        <Link
          href={homeRouteFor(user)}
          className={`w-full sm:w-auto text-center ${buttonClassName(variants.primary, "sm")} rounded-lg sm:rounded-xl px-4 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm`}
        >
          Open your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto ${className}`}>
      <Link
        href="/signup"
        className={`flex-1 sm:flex-none text-center ${buttonClassName(variants.primary, "sm")} rounded-lg sm:rounded-xl px-4 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm`}
      >
        Get started
      </Link>
      <Link
        href="/login"
        className={`flex-1 sm:flex-none text-center ${buttonClassName(variants.secondary, "sm")} rounded-lg sm:rounded-xl px-4 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm`}
      >
        Sign in
      </Link>
    </div>
  );
}
