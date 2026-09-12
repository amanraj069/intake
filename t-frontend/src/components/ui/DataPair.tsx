"use client";

import { type ReactNode } from "react";

interface DataPairProps {
  label: string;
  value: ReactNode;
}

/** The project's standard label-above-value presentation for a single data point. */
export default function DataPair({ label, value }: DataPairProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-xl font-medium text-text-primary dark:text-dark-text">{value}</p>
    </div>
  );
}
