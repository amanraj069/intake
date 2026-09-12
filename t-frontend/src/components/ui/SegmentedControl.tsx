"use client";

export interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface SegmentedControlProps<TValue extends string> {
  label: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  disabled?: boolean;
}

/**
 * A single-choice control drawn as one bordered strip of cells.
 * The selected cell swaps to the inverse colour rather than tinting.
 */
export default function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<TValue>) {
  return (
    <div className="w-full">
      <span className="block text-xs font-semibold   text-text-secondary dark:text-dark-text-secondary mb-2">
        {label}
      </span>

      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 sm:grid-cols-4 border border-input-border dark:border-dark-input-border rounded-xl overflow-hidden"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={[
                "px-4 py-3 text-xs font-bold  ",
                "transition-colors duration-100 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                // Cell separators only, so the strip reads as one bordered block.
                index % 2 === 1 ? "border-l border-input-border dark:border-dark-input-border" : "",
                index >= 2
                  ? "border-t border-input-border dark:border-dark-input-border sm:border-t-0"
                  : "",
                index === 2 ? "sm:border-l sm:border-input-border sm:dark:border-dark-input-border" : "",
                isSelected
                  ? "bg-text-primary text-bg-primary dark:bg-dark-text dark:text-dark-bg"
                  : "bg-transparent text-text-secondary hover:bg-black/5 hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-white/5 dark:hover:text-dark-text",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
