/** Renders an ISO timestamp in the app's standard long-date form. */
export function formatLongDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Today as `YYYY-MM-DD` in the user's own timezone, for a native date input. */
export function todayAsInputValue(): string {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localMidnight.toISOString().slice(0, 10);
}
