"use client";

interface FormErrorProps {
  message: string;
}

/** Submit-level failure notice: the accent rule is the only colour on the panel. */
export default function FormError({ message }: FormErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-stretch border border-black/10 dark:border-white/10"
    >
      <div className="w-[3px] shrink-0 bg-accent dark:bg-accent-dark" aria-hidden="true" />
      <div className="px-5 py-4">
        <p className="text-[10px] font-bold   text-accent dark:text-accent-dark">
          Not saved
        </p>
        <p className="mt-2 text-sm font-light text-text-primary dark:text-dark-text">{message}</p>
      </div>
    </div>
  );
}
