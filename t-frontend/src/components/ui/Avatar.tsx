"use client";

import { useState } from "react";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string | null;
  initials: string;
  size?: AvatarSize;
  className?: string;
}

const SIZES: Record<AvatarSize, string> = {
  sm: "w-9 h-9 text-[11px]",
  md: "w-12 h-12 text-sm",
  lg: "w-28 h-28 text-2xl",
};

/**
 * Square avatar that falls back to the user's initials, either when no picture
 * is set or when a stored image URL fails to load (a deleted Cloudinary asset,
 * say) so the slot never renders as a broken image.
 */
export default function Avatar({ src, initials, size = "sm", className = "" }: AvatarProps) {
  // Tracking the URL that failed rather than a boolean means a newly uploaded
  // picture is retried automatically, with no effect to reset the flag.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const box = `${SIZES[size]} shrink-0 flex items-center justify-center overflow-hidden select-none ${className}`;

  if (src && src !== failedSrc) {
    // Cloudinary already serves an optimised, correctly sized asset, so
    // next/image would only add a remote-pattern config for no gain.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
        className={`${box} object-cover border border-black/10 dark:border-white/10`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} bg-text-primary text-bg-primary dark:bg-dark-text dark:text-dark-bg font-bold uppercase tracking-wider`}
    >
      {initials}
    </span>
  );
}
