"use client";

import { SparkleIcon } from "@/components/icons";

/**
 * Small circular AI avatar shown next to every assistant message.
 * Mint-green circle with a white sparkle icon, matching the app's accent.
 * Hidden on phones, where its column would cost replies a tenth of the screen width.
 */
export default function AiAvatar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dark-muted ${className}`}
      aria-hidden="true"
    >
      <SparkleIcon className="h-4 w-4 text-accent-dark" />
    </span>
  );
}
