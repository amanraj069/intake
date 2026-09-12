"use client";

import { type ReactNode } from "react";

interface FieldLabelProps {
  children: ReactNode;
  /** Set when the label names a single control, so clicking it focuses that control. */
  htmlFor?: string;
  required?: boolean;
}

const LABEL_CLASSES =
  "block text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary";

/** The project's standard micro-label sitting above a form or filter control. */
export default function FieldLabel({ children, htmlFor, required }: FieldLabelProps) {
  const content = (
    <>
      {children}
      {required && (
        <span className="text-red-500 ml-1 font-bold" aria-hidden="true">
          *
        </span>
      )}
    </>
  );

  if (!htmlFor) return <span className={LABEL_CLASSES}>{content}</span>;

  return (
    <label htmlFor={htmlFor} className={LABEL_CLASSES}>
      {content}
    </label>
  );
}
