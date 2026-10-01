"use client";

import { CheckIcon } from "@/components/icons";
import { displayName } from "@/lib/userIdentity";
import type { SharedUser } from "@/types/sharedMeal";

interface RecipientCheckboxProps {
  recipient: SharedUser;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** One person who can see a meal; unticking marks their access for removal. */
export default function RecipientCheckbox({ recipient, checked, disabled, onChange }: RecipientCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          checked
            ? "border-accent bg-accent text-white dark:border-accent-dark dark:bg-accent-dark shadow-xs"
            : "border-black/20 dark:border-white/20 bg-black/[0.03] dark:bg-white/[0.05]"
        }`}
      >
        {checked && <CheckIcon className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary dark:text-dark-text">
          {displayName(recipient)}
        </span>
        <span className="block truncate text-xs font-light text-text-secondary dark:text-dark-text-secondary">
          {recipient.email}
        </span>
      </span>
      {!checked && (
        <span className="shrink-0 text-[11px] font-semibold text-red-600 dark:text-red-400">Will lose access</span>
      )}
    </label>
  );
}
