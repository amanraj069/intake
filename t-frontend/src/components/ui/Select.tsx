"use client";

import { type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  error?: string;
}

/** A native dropdown squared off and typeset to match the project's inputs. */
export default function Select({
  label,
  options,
  error,
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      <label
        htmlFor={selectId}
        className="block text-xs font-semibold uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary mb-2"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full appearance-none px-4 py-3 pr-10 text-sm
            bg-transparent border border-input-border
            text-text-primary
            transition-colors duration-150
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            dark:border-dark-input-border dark:text-dark-text
            dark:focus:border-accent-dark dark:focus:ring-accent-dark
            ${error ? "border-error dark:border-error-dark" : ""}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-bg-primary dark:bg-dark-bg">
              {option.label}
            </option>
          ))}
        </select>

        <svg
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-text-secondary dark:text-dark-text-secondary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="square"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {error && <p className="mt-1.5 text-xs text-error dark:text-error-dark">{error}</p>}
    </div>
  );
}
