"use client";

import { type ReactNode } from "react";

interface BadgeProps {
  variant: "success" | "warning" | "neutral";
  children: ReactNode;
  className?: string;
}

export default function Badge({
  variant,
  children,
  className = "",
}: BadgeProps) {
  const variants = {
    success:
      "bg-success/10 text-success dark:bg-success-dark/10 dark:text-success-dark",
    warning:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
    neutral:
      "bg-text-secondary/10 text-text-secondary dark:bg-dark-text-secondary/10 dark:text-dark-text-secondary",
  };

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-1
        text-xs font-semibold  
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
