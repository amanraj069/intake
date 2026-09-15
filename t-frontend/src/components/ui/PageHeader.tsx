"use client";

import { type ReactNode } from "react";
import BackButton from "./BackButton";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Tiny line above the title, e.g. the date the dashboard is showing. */
  eyebrow?: string;
  /** Shown when the page is a detail view the user navigated into. */
  showBackButton?: boolean;
  /** Page-level action, e.g. a "Log Meal" link on the list view. */
  action?: ReactNode;
  /** Action shown on the top right beside the title on mobile viewports (e.g. mobile delete button). */
  mobileAction?: ReactNode;
  /** Optional class name for the action wrapper container. */
  actionClassName?: string;
  /** When true, hides description on mobile so title and action sit on one compact row. */
  hideDescriptionOnMobile?: boolean;
  /** When true, stacks title and action vertically on mobile, giving action full width. */
  stackOnMobile?: boolean;
  /** When true, keeps action directly on the same vertical level as the title row. */
  alignActionWithTitle?: boolean;
}

/** The stark title block every signed-in page opens with. */
export default function PageHeader({
  title,
  description,
  eyebrow,
  showBackButton = false,
  action,
  mobileAction,
  actionClassName,
  hideDescriptionOnMobile = false,
  stackOnMobile = false,
  alignActionWithTitle = false,
}: PageHeaderProps) {
  if (alignActionWithTitle) {
    return (
      <header className="space-y-1.5 sm:space-y-2">
        {eyebrow && (
          <p className="mb-1 sm:mb-2 text-[10px] sm:text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {showBackButton && <BackButton size="md" className="pl-0 sm:pl-0" />}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary dark:text-dark-text truncate">
              {title}
            </h1>
          </div>
          {action && (
            <div className={`shrink-0 ${actionClassName ?? ""}`}>
              {action}
            </div>
          )}
        </div>
        {description && (
          <p
            className={`mt-1 sm:mt-1.5 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary line-clamp-2 sm:line-clamp-none leading-relaxed ${
              hideDescriptionOnMobile ? "hidden sm:block" : ""
            }`}
          >
            {description}
          </p>
        )}
      </header>
    );
  }

  return (
    <header
      className={`flex justify-between gap-3 sm:gap-6 ${
        stackOnMobile
          ? "flex-col sm:flex-row sm:items-end"
          : hideDescriptionOnMobile
          ? "flex-row items-center sm:items-end"
          : description
          ? "flex-col sm:flex-row sm:items-end"
          : "flex-row items-center"
      }`}
    >
      <div className={stackOnMobile ? "w-full sm:w-auto" : ""}>
        {eyebrow && (
          <p className="mb-1 sm:mb-3 text-[10px] sm:text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 min-h-10">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            {showBackButton && <BackButton size="md" className="pl-0 sm:pl-0 shrink-0" />}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary dark:text-dark-text truncate">
              {title}
            </h1>
          </div>
          {mobileAction && <div className="sm:hidden shrink-0 flex items-center">{mobileAction}</div>}
        </div>
        {description && (
          <p
            className={`mt-1.5 sm:mt-3 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary line-clamp-2 sm:line-clamp-none leading-relaxed ${
              hideDescriptionOnMobile ? "hidden sm:block" : ""
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className={`shrink-0 ${stackOnMobile ? "w-full sm:w-auto" : ""} ${actionClassName ?? ""}`}>
          {action}
        </div>
      )}
    </header>
  );
}
