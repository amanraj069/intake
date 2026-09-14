"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import Spinner from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const BASE_CLASSES =
  "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:active:scale-100 cursor-pointer";

const VARIANT_CLASSES = {
  primary:
    "bg-accent-muted text-white hover:bg-accent-muted-hover dark:bg-accent-dark-muted dark:hover:bg-accent-dark-muted-hover focus-visible:outline-accent",
  secondary:
    "bg-bg-card dark:bg-dark-bg-card border border-border text-text-primary hover:bg-bg-surface dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface focus-visible:outline-accent",
  danger:
    "bg-error text-white hover:bg-red-700 dark:bg-error-dark dark:hover:bg-red-500 focus-visible:outline-error",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-bg-surface dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface",
} as const;

const SIZE_CLASSES = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 sm:px-6 sm:py-3 text-sm",
  lg: "px-8 py-4 text-sm",
} as const;

function ButtonComponent(
  {
    variant = "primary",
    size = "md",
    loading = false,
    children,
    disabled,
    className = "",
    ...props
  }: ButtonProps,
  ref: Ref<HTMLButtonElement>
) {
  return (
    <button
      ref={ref}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2">
          <Spinner size="sm" />
        </span>
      )}
      {children}
    </button>
  );
}

const Button = forwardRef(ButtonComponent);
Button.displayName = "Button";

export default Button;
