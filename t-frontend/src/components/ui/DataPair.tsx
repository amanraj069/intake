"use client";

import { type ReactNode } from "react";

interface DataPairProps {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}

/** The project's standard label-above-value presentation for a single data point. */
export default function DataPair({ label, value, className = "", valueClassName = "" }: DataPairProps) {
  return (
    <div className={className}>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-dark-text-secondary">
        {label}
      </p>
      <div className={`mt-1 sm:mt-1.5 text-base sm:text-lg font-semibold text-text-primary dark:text-dark-text ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
