const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** A calendar day in `YYYY-MM-DD` form, e.g. `2026-09-12`. */
export type CalendarDay = string;

/**
 * True only for a day string that names a date that actually exists.
 * `Date.parse` alone is too lax: it rolls `2026-02-31` forward into March.
 */
export function isRealCalendarDay(day: string): boolean {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

/**
 * Midnight UTC on the given day, the inclusive lower bound of that day's entries.
 * Entries are stored at UTC midnight because the client sends a bare `YYYY-MM-DD`,
 * so day boundaries are compared in UTC throughout.
 */
export function startOfDay(day: CalendarDay): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Midnight UTC on the following day, the exclusive upper bound of a day's entries. */
export function startOfNextDay(day: CalendarDay): Date {
  return new Date(startOfDay(day).getTime() + MILLISECONDS_PER_DAY);
}

export function today(): CalendarDay {
  return new Date().toISOString().slice(0, 10);
}

/** The day `dayCount` days before the given one, e.g. for a rolling default range. */
export function daysBefore(day: CalendarDay, dayCount: number): CalendarDay {
  const shifted = new Date(startOfDay(day).getTime() - dayCount * MILLISECONDS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

/** How many days an inclusive range covers: one for a single day, seven for a week. */
export function countCalendarDays(startDay: CalendarDay, endDay: CalendarDay): number {
  const spanMs = startOfDay(endDay).getTime() - startOfDay(startDay).getTime();
  return Math.floor(spanMs / MILLISECONDS_PER_DAY) + 1;
}

/**
 * Every day in an inclusive range, ascending. Empty for an inverted range, so a
 * caller that skipped the start-before-end check gets no days rather than a hang.
 */
export function enumerateCalendarDays(
  startDay: CalendarDay,
  endDay: CalendarDay
): CalendarDay[] {
  const dayCount = countCalendarDays(startDay, endDay);
  if (dayCount <= 0) return [];

  const startMs = startOfDay(startDay).getTime();

  return Array.from({ length: dayCount }, (_, index) =>
    new Date(startMs + index * MILLISECONDS_PER_DAY).toISOString().slice(0, 10)
  );
}
