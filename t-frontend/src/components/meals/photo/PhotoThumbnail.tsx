"use client";

import { useState } from "react";
import { CameraIcon } from "@/components/icons";

interface PhotoThumbnailProps {
  src: string | null;
  /** Dims the photo and pulses it while it is being analysed. */
  busy?: boolean;
}

/** The chosen photo at thumbnail size. Formats the browser cannot draw (HEIC outside Safari) fall back to an icon. */
export default function PhotoThumbnail({ src, busy = false }: PhotoThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const canShowImage = src && failedSrc !== src;

  return (
    <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-bg-app dark:bg-dark-bg-app border border-black/5 dark:border-white/10">
      {canShowImage ? (
        // A blob: URL cannot go through next/image's optimiser, so a plain img is correct here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Your food photo"
          onError={() => setFailedSrc(src)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${busy ? "opacity-60" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-secondary dark:text-dark-text-secondary">
          <CameraIcon className="h-6 w-6" />
        </div>
      )}
      {busy && <div className="absolute inset-0 animate-pulse bg-white/30 dark:bg-black/30" aria-hidden="true" />}
    </div>
  );
}
