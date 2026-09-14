"use client";

interface AuthStepHeaderProps {
  title: string;
  description: string;
  /** 1-based position within a multi-screen flow, when there is one. */
  step?: { current: number; total: number };
}

/** Title block for a screen in the split auth panel, with an optional step meter. */
export default function AuthStepHeader({ title, description, step }: AuthStepHeaderProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {step && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: step.total }, (_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index < step.current
                    ? "w-8 bg-accent dark:bg-accent-dark"
                    : "w-4 bg-border dark:bg-dark-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
            Step {step.current} of {step.total}
          </span>
        </div>
      )}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary dark:text-dark-text">
          {title}
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}
