import { AiMicronutrientReading, normaliseAiMicronutrients } from '../../lib/aiMicronutrients';
import { MICRONUTRIENT_NAMES } from '../../lib/micronutrientCatalog';
import { MAX_REPORTED_MICRONUTRIENTS, aiMicronutrientSchema } from '../../lib/nutritionExtractionPrompt';

export const MICRONUTRIENTS_PARAMETER = {
  type: 'ARRAY',
  description: `The item's significant micronutrients, at most ${MAX_REPORTED_MICRONUTRIENTS}, most significant first`,
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', enum: [...MICRONUTRIENT_NAMES] },
      amount: { type: 'NUMBER' },
      unit: { type: 'STRING', enum: ['mg', 'mcg'] },
    },
    required: ['name', 'amount', 'unit'],
  },
};

/**
 * Micronutrients are optional detail, so a malformed reading is dropped (and
 * logged) rather than refusing the whole meal. Kept readings go through the
 * same catalog filter and mg conversion as photo extraction.
 */
function toMicros(rawMicronutrients: unknown): AiMicronutrientReading[] | undefined {
  if (!Array.isArray(rawMicronutrients)) return undefined;

  return rawMicronutrients.flatMap((rawReading) => {
    const parsed = aiMicronutrientSchema.safeParse(rawReading);
    if (parsed.success) return [parsed.data];
    console.warn('[ChatItems] Ignoring a malformed micronutrient reading:', rawReading);
    return [];
  });
}

/**
 * The model describes items with flat macro fields, which it fills far more
 * reliably than nested objects. Anything that is not an item-shaped object is
 * passed through untouched for the schema to reject with a readable message.
 */
export function toItemInput(rawItem: unknown): unknown {
  if (typeof rawItem !== 'object' || rawItem === null) return rawItem;
  const { proteinG, carbG, fatG, micronutrients, ...rest } = rawItem as Record<string, unknown>;
  const readings = toMicros(micronutrients);
  const micros = readings && normaliseAiMicronutrients(readings, MAX_REPORTED_MICRONUTRIENTS);
  return { ...rest, macros: { proteinG, carbG, fatG }, ...(micros ? { micros } : {}) };
}

export function toItemsInput(rawItems: unknown): unknown {
  return Array.isArray(rawItems) ? rawItems.map(toItemInput) : rawItems;
}
