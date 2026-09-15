"use client";

import { type ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

interface ShowcaseCardProps {
  title: string;
  description: string;
  /** A wide card spans two grid columns and sits its visual beside the copy. */
  wide?: boolean;
  /** Zero-based index — drives alternating left/right placement & slide direction on mobile. */
  index?: number;
  children: ReactNode;
}

export default function ShowcaseCard({
  title,
  description,
  wide = false,
  index = 0,
  children,
}: ShowcaseCardProps) {
  const isLeft = index % 2 === 0;

  const layout = wide
    ? "lg:col-span-2 sm:grid sm:grid-cols-2 sm:items-center sm:gap-6 lg:gap-10"
    : "flex flex-col";

  // Mobile: alternate left (even) / right (odd) placement
  const mobileAlign = isLeft ? "mr-auto sm:mr-0" : "ml-auto sm:ml-0";
  const mobileTextAlign = isLeft ? "text-left" : "text-right sm:text-left";

  const { ref, isVisible } = useInViewOnce<HTMLElement>({
    rootMargin: "-100px 0px 0px 0px",
  });

  // On mobile: slide from left or right; on sm+: slide up as before
  const enterClass = isVisible
    ? "opacity-100 translate-x-0 translate-y-0"
    : isLeft
      ? "opacity-0 -translate-x-10 sm:translate-x-0 sm:translate-y-5"
      : "opacity-0 translate-x-10 sm:translate-x-0 sm:translate-y-5";

  return (
    <article
      ref={ref}
      className={`w-[80%] sm:w-auto rounded-xl sm:rounded-2xl bg-bg-card dark:bg-dark-bg-card p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu hover:-translate-y-0.5 hover:shadow-md ${enterClass} ${layout} ${mobileAlign}`}
    >
      <div className={mobileTextAlign}>
        <h3 className="text-sm sm:text-xl font-bold tracking-tight text-text-primary dark:text-dark-text">
          {title}
        </h3>
        <p className="mt-1 sm:mt-2 text-[11px] sm:text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>
      </div>
      <div
        className={wide ? "mt-2 sm:mt-0" : "mt-2.5 sm:mt-8 flex flex-1 flex-col justify-end"}
        aria-hidden="true"
      >
        {children}
      </div>
    </article>
  );
}
