"use client";

import { type SelectHTMLAttributes } from "react";
import { FIELD_DENSITY_CLASSES, type FieldDensity } from "./Input";

/** Room on the right for the chevron, and where it sits, at each density. */
const CHEVRON_SPACE: Record<FieldDensity, { padding: string; position: string }> = {
  comfortable: { padding: "pr-10", position: "right-4" },
  compact: { padding: "pr-8", position: "right-3" },
};

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  density?: FieldDensity;
  /** Extra label classes, e.g. `md:sr-only` where a table header already names the column. */
  labelClassName?: string;
}

/** A native dropdown squared off and typeset to match the project's inputs. */
export default function Select({
  label,
  options,
  error,
  density = "comfortable",
  labelClassName = "",
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      <label
        htmlFor={selectId}
        className={`block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-2 ${labelClassName}`}
      >
        {label}
        {props.required && (
          <span className="text-red-500 ml-1 font-bold" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full appearance-none ${FIELD_DENSITY_CLASSES[density]} ${CHEVRON_SPACE[density].padding} text-sm rounded-xl
            bg-white dark:bg-white/5 border border-input-border
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
          className={`pointer-events-none absolute ${CHEVRON_SPACE[density].position} top-1/2 -translate-y-1/2 h-3 w-3 text-text-secondary dark:text-dark-text-secondary`}
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
