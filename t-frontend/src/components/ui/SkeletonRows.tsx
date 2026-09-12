"use client";

interface SkeletonRowsProps {
  /** How many placeholder bars to draw while content loads. */
  count?: number;
}

/** A neutral loading placeholder, so a pending panel never renders as blank space. */
export default function SkeletonRows({ count = 4 }: SkeletonRowsProps) {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-12 bg-text-secondary/10 dark:bg-dark-text-secondary/10" />
      ))}
    </div>
  );
}
