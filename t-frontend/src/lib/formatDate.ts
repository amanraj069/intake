/**
 * Entries store the day they were eaten as midnight UTC, so every display
 * helper formats in UTC. Reading them in the viewer's zone would show the
 * previous day for anyone west of Greenwich.
 */
const UTC = "UTC";

/** Renders an ISO timestamp in the app's standard long-date form, e.g. "September 12, 2026". */
export function formatLongDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: UTC,
  });
}

/** A compact form for dense rows, e.g. "Sat, Sep 12". */
export function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: UTC,
  });
}

/** Formats an ISO date into DD/MM/YY format, e.g. "12/09/26". */
export function formatNumericDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/** Today as `YYYY-MM-DD` in the user's own timezone, for a native date input. */
export function todayAsInputValue(): string {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localMidnight.toISOString().slice(0, 10);
}

/** The `YYYY-MM-DD` a native date input expects, taken from a stored ISO timestamp. */
export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/** The day `dayCount` days before the given one, for default filter ranges. */
export function daysBefore(day: string, dayCount: number): string {
  const shifted = new Date(`${day}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() - dayCount);
  return shifted.toISOString().slice(0, 10);
}

/** The weekday a stored day falls on, e.g. "Sat", for a trend axis. */
export function formatWeekday(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: UTC,
  });
}

/** Day and month without the year, e.g. "12 Sep", where the year is implied. */
export function formatDayAndMonth(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: UTC,
  });
}
