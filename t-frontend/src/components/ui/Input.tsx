"use client";

import { type InputHTMLAttributes, forwardRef, type Ref, useState } from "react";

export type FieldDensity = "comfortable" | "compact";

/** Compact fields suit dense grids, such as rows of an editable table. */
export const FIELD_DENSITY_CLASSES: Record<FieldDensity, string> = {
  comfortable: "px-4 py-3",
  compact: "px-2.5 py-2",
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  density?: FieldDensity;
  /** Extra label classes, e.g. `md:sr-only` where a table header already names the column. */
  labelClassName?: string;
}

function InputComponent(
  {
    label,
    error,
    density = "comfortable",
    labelClassName = "",
    className = "",
    id,
    type,
    ...props
  }: InputProps,
  ref: Ref<HTMLInputElement>
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-2 ${labelClassName}`}
        >
          {label}
          {props.required && (
            <span className="text-red-500 ml-1 font-bold" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={currentType}
          className={`
            w-full ${FIELD_DENSITY_CLASSES[density]} text-sm rounded-xl
            bg-white dark:bg-white/5
            border border-input-border
            text-text-primary
            placeholder:text-text-secondary/50
            transition-colors duration-150
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            dark:border-dark-input-border
            dark:text-dark-text
            dark:placeholder:text-dark-text-secondary/50
            dark:focus:border-accent-dark dark:focus:ring-accent-dark
            ${isPassword ? "pr-12" : ""}
            ${error ? "border-error dark:border-error-dark" : ""}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-0 bottom-0 px-4 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text transition-colors flex items-center justify-center focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-error dark:text-error-dark">
          {error}
        </p>
      )}
    </div>
  );
}

const Input = forwardRef(InputComponent);
Input.displayName = "Input";

export default Input;
