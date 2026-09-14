/**
 * The model describes items with flat macro fields, which it fills far more
 * reliably than nested objects. Anything that is not an item-shaped object is
 * passed through untouched for the schema to reject with a readable message.
 */
export function toItemInput(rawItem: unknown): unknown {
  if (typeof rawItem !== 'object' || rawItem === null) return rawItem;
  const { proteinG, carbG, fatG, ...rest } = rawItem as Record<string, unknown>;
  return { ...rest, macros: { proteinG, carbG, fatG } };
}

export function toItemsInput(rawItems: unknown): unknown {
  return Array.isArray(rawItems) ? rawItems.map(toItemInput) : rawItems;
}
