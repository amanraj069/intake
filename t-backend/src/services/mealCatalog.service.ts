import { AnyBulkWriteOperation, FlattenMaps, Types } from 'mongoose';

import { normaliseFoodName } from '../lib/mealLogRequest';
import { StoredCatalogueSynonyms } from '../models/ChatMessage';
import { IFoodEntryDocument, IFoodItem } from '../models/FoodEntry';
import { MealCatalogDish } from '../models/MealCatalogDish';
import { MealCatalogItem } from '../models/MealCatalogItem';

/** A logged item as plain data: micronutrients read back as an object, not a Map. */
type LoggedItem = FlattenMaps<IFoodItem>;

/** A catalogue item as the chat reads it. */
export type CatalogueItem = LoggedItem & { _id: Types.ObjectId; key: string; synonyms: string[] };

/** A catalogue dish with its links resolved. `item` is null only if a linked item no longer exists. */
export interface CatalogueDish {
  key: string;
  synonyms: string[];
  name: string;
  components: { item: CatalogueItem | null; quantity: number }[];
}

/** What recording needs from a saved meal, so a created, updated or bulk-inserted entry all qualify. */
type LoggedMeal = Pick<IFoodEntryDocument, 'name' | 'toObject'>;

/** An item is one food in one unit, so this is what identifies it within a user's catalogue. */
function itemIdentity(key: string, unit: string): string {
  return `${key}|${unit}`;
}

function loggedItems(entry: LoggedMeal): LoggedItem[] {
  return (entry.toObject({ flattenMaps: true }) as { items: LoggedItem[] }).items;
}

function toItemUpsert(userId: string, item: LoggedItem, now: Date): AnyBulkWriteOperation | null {
  const key = normaliseFoodName(item.name);
  if (!key) return null;
  const { name, quantity, unit, calories, macros, micros } = item;
  return {
    updateOne: {
      filter: { userId, key, unit },
      update: { $set: { name, quantity, calories, macros, micros, lastLoggedAt: now } },
      upsert: true,
    },
  };
}

/**
 * Saves each item's latest portion and returns every item's id by identity.
 * A bulk upsert only reports the ids it inserted, so one read collects the
 * ids of the items it updated too.
 */
async function upsertItems(userId: string, items: LoggedItem[], now: Date) {
  const upserts = items.map((item) => toItemUpsert(userId, item, now)).filter((op) => op !== null);
  if (upserts.length === 0) return new Map<string, Types.ObjectId>();
  await MealCatalogItem.bulkWrite(upserts);

  const keys = [...new Set(items.map((item) => normaliseFoodName(item.name)))];
  const saved = await MealCatalogItem.find({ userId, key: { $in: keys } })
    .select({ key: 1, unit: 1 })
    .lean();
  return new Map(saved.map((item) => [itemIdentity(item.key, item.unit), item._id]));
}

function toDishComponent(item: LoggedItem, itemIds: Map<string, Types.ObjectId>) {
  const id = itemIds.get(itemIdentity(normaliseFoodName(item.name), item.unit));
  return id ? { item: id, quantity: item.quantity } : null;
}

function toDishUpsert(
  userId: string,
  entry: LoggedMeal,
  itemIds: Map<string, Types.ObjectId>,
  now: Date
): AnyBulkWriteOperation | null {
  const key = normaliseFoodName(entry.name);
  const components = loggedItems(entry).map((item) => toDishComponent(item, itemIds));
  if (!key || components.some((component) => component === null)) return null;
  return {
    updateOne: {
      filter: { userId, key },
      update: { $set: { name: entry.name, components, lastLoggedAt: now } },
      upsert: true,
    },
  };
}

/**
 * Adds freshly saved meals to the user's catalogue: every item with its
 * latest portion, and every meal of several items as a dish linking them.
 * The catalogue only saves model calls later, so a failure here is logged and
 * never fails the meal save that triggered it.
 */
export async function recordLoggedMeals(
  userId: string,
  entries: readonly LoggedMeal[]
): Promise<void> {
  try {
    const now = new Date();
    const itemIds = await upsertItems(userId, entries.flatMap(loggedItems), now);
    const dishUpserts = entries
      .filter((entry) => loggedItems(entry).length > 1)
      .map((entry) => toDishUpsert(userId, entry, itemIds, now))
      .filter((op) => op !== null);
    if (dishUpserts.length > 0) await MealCatalogDish.bulkWrite(dishUpserts);
  } catch (error) {
    console.error('[MealCatalog] Could not add logged meals to the catalogue:', error);
  }
}

/** Each branch of the `$or` is served by its own index: the unique name index, or the multikey synonyms index. */
function byNameOrSynonym(userId: string, keys: readonly string[]) {
  return { userId, $or: [{ key: { $in: keys } }, { synonyms: { $in: keys } }] };
}

/** The user's dishes stored under any of the given names or synonyms, each with its linked items loaded. */
export async function findCatalogueDishes(
  userId: string,
  keys: readonly string[]
): Promise<CatalogueDish[]> {
  if (keys.length === 0) return [];
  return MealCatalogDish.find(byNameOrSynonym(userId, keys))
    .select({ key: 1, synonyms: 1, name: 1, components: 1 })
    .populate<{ components: CatalogueDish['components'] }>('components.item')
    .lean();
}

/** The user's items stored under any of the given names or synonyms, in any unit, most recently logged first. */
export async function findCatalogueItems(
  userId: string,
  keys: readonly string[]
): Promise<CatalogueItem[]> {
  if (keys.length === 0) return [];
  return MealCatalogItem.find(byNameOrSynonym(userId, keys))
    .sort({ lastLoggedAt: -1 })
    .lean<CatalogueItem[]>();
}

/** Distinct normalised names, never the food's own key: that already matches. */
function toSynonymKeys(synonyms: readonly string[], ownKey: string): string[] {
  const keys = synonyms.map(normaliseFoodName).filter((key) => key && key !== ownKey);
  return [...new Set(keys)];
}

function toSynonymUpdate(filter: Record<string, unknown>, keys: string[]): AnyBulkWriteOperation {
  return { updateOne: { filter, update: { $addToSet: { synonyms: { $each: keys } } } } };
}

function itemSynonymUpdates(userId: string, entry: LoggedMeal, synonyms: StoredCatalogueSynonyms) {
  const saved = new Set(
    loggedItems(entry).map((item) => itemIdentity(normaliseFoodName(item.name), item.unit))
  );
  return synonyms.items.flatMap(({ name, unit, synonyms: names }) => {
    const key = normaliseFoodName(name);
    const keys = toSynonymKeys(names, key);
    // An item the user edited or removed before confirming is not the food these names describe.
    if (!saved.has(itemIdentity(key, unit)) || keys.length === 0) return [];
    return [toSynonymUpdate({ userId, key, unit }, keys)];
  });
}

/**
 * Adds the names the model gave a confirmed meal's foods to their catalogue
 * item and dish, so the same food typed in another language or spelling is
 * matched next time without a model call. Names accumulate across logs. Runs
 * after the meal is saved and recorded, so the catalogue documents exist; a
 * failure is logged and never fails the save.
 */
export async function addCatalogueSynonyms(
  userId: string,
  entry: LoggedMeal,
  synonyms: StoredCatalogueSynonyms | undefined
): Promise<void> {
  if (!synonyms) return;
  try {
    const itemUpdates = itemSynonymUpdates(userId, entry, synonyms);
    const dishKey = normaliseFoodName(entry.name);
    const dishKeys = loggedItems(entry).length > 1 ? toSynonymKeys(synonyms.dish, dishKey) : [];

    if (itemUpdates.length > 0) await MealCatalogItem.bulkWrite(itemUpdates);
    if (dishKeys.length > 0)
      await MealCatalogDish.bulkWrite([toSynonymUpdate({ userId, key: dishKey }, dishKeys)]);
  } catch (error) {
    console.error('[MealCatalog] Could not add synonyms to the catalogue:', error);
  }
}
