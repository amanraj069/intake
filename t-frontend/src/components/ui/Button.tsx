"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold tracking-wide uppercase transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover dark:bg-accent-dark dark:hover:bg-accent-dark-hover focus-visible:outline-accent",
    secondary:
      "border border-border text-text-primary hover:bg-bg-surface dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface focus-visible:outline-accent",
    danger:
      "bg-error text-white hover:bg-red-700 dark:bg-error-dark dark:hover:bg-red-500 focus-visible:outline-error",
    ghost:
      "text-text-secondary hover:text-text-primary hover:bg-bg-surface dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-surface",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
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
