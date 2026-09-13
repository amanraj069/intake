"use client";

import { TrashIcon } from "@/components/icons";

interface RemoveIconButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}

/** The compact red bin button the review table uses for removing a meal or a dish. */
export default function RemoveIconButton({ label, disabled, onClick, className = "" }: RemoveIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-error dark:text-error-dark hover:bg-red-500/10 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
