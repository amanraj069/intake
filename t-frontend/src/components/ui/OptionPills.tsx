"use client";

import { useEffect, useRef, useState } from "react";

export interface PillOption<TValue extends string> {
  value: TValue;
  label: string;
}

export type PillSize = "sm" | "md" | "lg";

interface OptionPillsProps<TValue extends string> {
  label: string;
  options: readonly PillOption<TValue>[];
  value: TValue;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: PillSize;
  className?: string;
  onChange: (value: TValue) => void;
}

const SIZE_CONTAINER: Record<PillSize, string> = {
  sm: "h-9 p-1 rounded-xl",
  md: "h-11 p-1 sm:p-1.25 rounded-xl",
  lg: "h-12 p-1.5 rounded-2xl",
};

const SIZE_INDICATOR: Record<PillSize, string> = {
  sm: "top-1 bottom-1 rounded-lg",
  md: "top-1 bottom-1 sm:top-1.25 sm:bottom-1.25 rounded-lg sm:rounded-xl",
  lg: "top-1.5 bottom-1.5 rounded-xl",
};

const SIZE_BUTTON: Record<PillSize, string> = {
  sm: "px-3 sm:px-4 text-xs",
  md: "px-4 sm:px-5 text-xs sm:text-sm",
  lg: "px-5 sm:px-6 text-sm sm:text-base",
};

export default function OptionPills<TValue extends string>({
  label,
  options,
  value,
  disabled = false,
  fullWidth = false,
  size = "sm",
  className = "",
  onChange,
}: OptionPillsProps<TValue>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    function updateIndicator() {
      if (containerRef.current) {
        const selectedIndex = options.findIndex((opt) => opt.value === value);
        const buttons = containerRef.current.querySelectorAll("button");
        const button = buttons[selectedIndex];
        if (button) {
          setIndicatorStyle({
            left: button.offsetLeft,
            width: button.offsetWidth,
          });
        }
      }
    }

    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);

    const observer =
      typeof ResizeObserver !== "undefined" && containerRef.current
        ? new ResizeObserver(updateIndicator)
        : null;
    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
      observer?.disconnect();
    };
  }, [value, options, size]);

  const hasCustomHeight = /\bh-\S+/.test(className);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      className={`relative flex items-center border border-input-border dark:border-dark-input-border bg-black/[0.03] dark:bg-[#11141D] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden ${
        hasCustomHeight ? "" : SIZE_CONTAINER[size]
      } ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {/* Animated Sliding Background */}
      <div
        className={`absolute bg-white dark:bg-[#252A36] border border-black/5 dark:border-white/15 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${SIZE_INDICATOR[size]}`}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.width > 0 ? 1 : 0,
        }}
      />

      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`relative z-10 h-full flex items-center justify-center font-semibold transition-colors duration-200 rounded-lg disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap cursor-pointer select-none ${
              SIZE_BUTTON[size]
            } ${fullWidth ? "flex-1" : ""} ${
              isSelected
                ? "text-text-primary dark:text-white font-bold"
                : "text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
