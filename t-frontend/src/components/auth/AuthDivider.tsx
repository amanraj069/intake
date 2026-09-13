"use client";

/** The hairline "or" between the Google button and the email form. */
export default function AuthDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border dark:border-dark-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-bg-primary dark:bg-dark-bg px-4 text-xs text-text-secondary dark:text-dark-text-secondary">
          or
        </span>
      </div>
    </div>
  );
}
