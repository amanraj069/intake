/** Longest name an entry may have, matching the limit on an item's name. */
export const MAX_ENTRY_NAME_LENGTH = 200;

/**
 * The name an entry gets when none is given: its item names joined, the way a
 * person reads a plate back ("Roti + Paneer sabji").
 */
export function defaultEntryName(items: readonly { name: string }[]): string {
  return items
    .map((item) => item.name.trim())
    .join(' + ')
    .slice(0, MAX_ENTRY_NAME_LENGTH);
}
