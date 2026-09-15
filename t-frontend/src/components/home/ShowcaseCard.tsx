"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ShowcaseCardProps {
  title: string;
  description: string;
  /** A wide card spans two grid columns and sits its visual beside the copy. */
  wide?: boolean;
  children: ReactNode;
}

export default function ShowcaseCard({ title, description, wide = false, children }: ShowcaseCardProps) {
  const layout = wide ? "lg:col-span-2 sm:grid sm:grid-cols-2 sm:items-center sm:gap-6 lg:gap-10" : "flex flex-col";
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "80px 0px 40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      className={`rounded-xl sm:rounded-2xl bg-bg-card dark:bg-dark-bg-card p-3.5 sm:p-6 lg:p-8 shadow-sm dark:shadow-none transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu hover:-translate-y-0.5 hover:shadow-md ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      } ${layout}`}
    >
      <div>
        <h3 className="text-sm sm:text-xl font-bold tracking-tight text-text-primary dark:text-dark-text">{title}</h3>
        <p className="mt-1 sm:mt-2 text-[11px] sm:text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>
      </div>
      <div className={wide ? "mt-2.5 sm:mt-0" : "mt-2.5 sm:mt-8 flex flex-1 flex-col justify-end"} aria-hidden="true">
        {children}
      </div>
    </article>
  );
}
