import type { FoodEntry } from "@/types/nutrition";

export interface EntryDayGroup {
  /** The `YYYY-MM-DD` day the group's entries share, used as its key. */
  day: string;
  entries: FoodEntry[];
}

/**
 * Splits entries into consecutive day groups, preserving the order given.
 * The list endpoint already sorts by date descending, so a day is never split
 * across two groups within a page.
 */
export function groupEntriesByDate(entries: FoodEntry[]): EntryDayGroup[] {
  const groups: EntryDayGroup[] = [];

  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    const openGroup = groups.at(-1);

    if (openGroup?.day === day) {
      openGroup.entries.push(entry);
      continue;
    }

    groups.push({ day, entries: [entry] });
  }

  return groups;
}
