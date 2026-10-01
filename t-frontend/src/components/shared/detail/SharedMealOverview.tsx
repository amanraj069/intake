"use client";

import Avatar from "@/components/ui/Avatar";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/formatDate";
import { formatMealLabel } from "@/lib/mealTime";
import { displayName, initials } from "@/lib/userIdentity";
import type { FoodEntrySource } from "@/types/nutrition";
import type { SharedMeal } from "@/types/sharedMeal";

const SOURCE_LABELS: Record<FoodEntrySource, string> = {
  manual: "Manual entry",
  "ai-image": "AI photo",
  "pdf-import": "PDF import",
  "ai-chat": "Assistant",
};

/** `hideOnPhone` picks the display value itself: stacking `hidden` on `inline-flex` would leave the winner to stylesheet order. */
function Chip({ children, hideOnPhone = false }: { children: string; hideOnPhone?: boolean }) {
  return (
    <span className={`${hideOnPhone ? "hidden sm:inline-flex" : "inline-flex"} items-center rounded-full bg-bg-surface dark:bg-dark-surface px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-semibold text-text-primary dark:text-dark-text`}>
      {children}
    </span>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">{label}</p>
      <p className="mt-0.5 truncate text-[13px] sm:text-sm font-semibold text-text-primary dark:text-dark-text">{value}</p>
    </div>
  );
}

/** The meal at a glance: its photo, when it was eaten, and who shared it. */
export default function SharedMealOverview({ sharedMeal }: { sharedMeal: SharedMeal }) {
  const { meal, sharedBy, sharedAt } = sharedMeal;
  const dishCount = meal.items.length === 1 ? "1 dish" : `${meal.items.length} dishes`;

  return (
    <section className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-4 sm:p-7 flex flex-col sm:flex-row gap-4 sm:gap-8">
      {meal.imageUrl && (
        <img
          src={meal.imageUrl}
          alt={meal.name}
          className="w-full sm:w-52 aspect-[16/10] sm:aspect-square rounded-xl object-cover border border-black/5 dark:border-white/10 shrink-0"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 sm:gap-6">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Chip>{formatMealLabel(meal.mealType)}</Chip>
          <Chip>{formatLongDate(meal.date)}</Chip>
          {meal.time && <Chip>{formatTime(meal.time)}</Chip>}
          {/* The Dishes section already counts them; on a phone this chip would only wrap onto a line of its own. */}
          <Chip hideOnPhone>{dishCount}</Chip>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-bg-surface dark:bg-dark-surface px-3 py-2.5 sm:p-4">
          <Avatar initials={initials(sharedBy)} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">Shared by</p>
            <p className="truncate text-sm sm:text-base font-bold text-text-primary dark:text-dark-text">{displayName(sharedBy)}</p>
            <p className="truncate text-xs font-light text-text-secondary dark:text-dark-text-secondary">{sharedBy.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <LabelValue label="Shared on" value={formatShortDate(sharedAt)} />
          <LabelValue label="Logged via" value={SOURCE_LABELS[meal.source]} />
        </div>
      </div>
    </section>
  );
}
