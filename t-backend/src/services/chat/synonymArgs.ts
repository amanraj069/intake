import { StoredCatalogueSynonyms } from '../../models/ChatMessage';
import { FoodItemInput } from '../../schemas/foodEntry.schema';

/** Enough for English, Hindi, Devanagari and a spelling variant or two, without letting one food claim many names. */
const MAX_SYNONYMS_PER_FOOD = 8;
const MAX_SYNONYM_LENGTH = 60;

const SYNONYM_RULES =
  'Other names a user might type for exactly this food: its English and Hindi names, the Hindi name in Devanagari, and common Hinglish spellings (e.g. for "Rice": "chawal", "चावल"). Never a broader category ("curry", "snack") or a different food.';

export const ITEM_SYNONYMS_PARAMETER = {
  type: 'ARRAY',
  description: `${SYNONYM_RULES} At most ${MAX_SYNONYMS_PER_FOOD}.`,
  items: { type: 'STRING' },
};

export const MEAL_NAME_SYNONYMS_PARAMETER = {
  type: 'ARRAY',
  description: `Only with several items: other names for the whole meal, by the same rules as item synonyms (e.g. for "Roti sabji": "roti sabzi", "रोटी सब्जी"). At most ${MAX_SYNONYMS_PER_FOOD}.`,
  items: { type: 'STRING' },
};

/** Synonyms only save a later model call, so anything malformed is dropped rather than failing the proposal. */
function toSynonymList(rawSynonyms: unknown): string[] {
  if (!Array.isArray(rawSynonyms)) return [];
  const names = rawSynonyms
    .filter((synonym): synonym is string => typeof synonym === 'string')
    .map((synonym) => synonym.trim())
    .filter((synonym) => synonym.length > 0 && synonym.length <= MAX_SYNONYM_LENGTH);
  return [...new Set(names)].slice(0, MAX_SYNONYMS_PER_FOOD);
}

/**
 * The synonyms the model gave alongside a validated meal. Each item's list is
 * read from the raw item at the same position, then tied to the validated
 * item's name and unit, which is how the saved food is found again.
 */
export function readCatalogueSynonyms(
  rawArgs: Record<string, unknown>,
  items: readonly FoodItemInput[]
): StoredCatalogueSynonyms | undefined {
  const rawItems: unknown[] = Array.isArray(rawArgs.items) ? rawArgs.items : [];
  const itemSynonyms = items
    .map((item, index) => {
      const rawItem = rawItems[index];
      const rawSynonyms =
        typeof rawItem === 'object' && rawItem !== null
          ? (rawItem as Record<string, unknown>).synonyms
          : undefined;
      return { name: item.name, unit: item.unit, synonyms: toSynonymList(rawSynonyms) };
    })
    .filter((item) => item.synonyms.length > 0);
  const dish = items.length > 1 ? toSynonymList(rawArgs.nameSynonyms) : [];

  if (itemSynonyms.length === 0 && dish.length === 0) return undefined;
  return { dish, items: itemSynonyms };
}
