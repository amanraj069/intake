"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { buttonClassName } from "@/components/ui/Button";
import { homeRouteFor } from "@/lib/postAuthRoute";

interface HomeCtaLinksProps {
  className?: string;
}

const CTA_SIZE_CLASSES = "text-center rounded-lg sm:rounded-xl px-6 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm";

/**
 * The primary calls to action, shared by the hero and the closing card. A
 * signed-in visitor gets a single link back into the app instead of signup.
 */
export default function HomeCtaLinks({ className = "" }: HomeCtaLinksProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={`h-9 sm:h-[52px] ${className}`} aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className={`flex flex-row items-center justify-center gap-2.5 sm:gap-3 ${className}`}>
        <Link href={homeRouteFor(user)} className={`${buttonClassName("primary", "sm")} ${CTA_SIZE_CLASSES}`}>
          Open your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-row items-center justify-center gap-2.5 sm:gap-3 ${className}`}>
      <Link href="/signup" className={`${buttonClassName("primary", "sm")} ${CTA_SIZE_CLASSES}`}>
        Get started
      </Link>
      <Link href="/login" className={`${buttonClassName("secondary", "sm")} ${CTA_SIZE_CLASSES}`}>
        Sign in
      </Link>
    </div>
  );
}
