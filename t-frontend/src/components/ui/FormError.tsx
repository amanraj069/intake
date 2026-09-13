"use client";

interface FormErrorProps {
  message: string;
}

/** Submit-level failure notice: the accent rule is the only colour on the panel. */
export default function FormError({ message }: FormErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start rounded-xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card shadow-sm"
    >
      <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-error dark:bg-error-dark" aria-hidden="true" />
          <p className="text-[10px] font-bold   text-error dark:text-error-dark">
            Not saved
          </p>
        </div>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-text-primary dark:text-dark-text">
          {message}
        </p>
      </div>
    </div>
  );
}
