"use client";

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        bg-bg-surface border border-border
        shadow-sm
        p-6
        dark:bg-dark-surface dark:border-dark-border
        dark:shadow-none
        ${className}
      `}
    >
      {children}
    </div>
  );
}
