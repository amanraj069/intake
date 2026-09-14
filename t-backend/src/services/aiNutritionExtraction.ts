import {
  GeminiResponseSchema,
  InlineImage,
  generateStructuredJson,
} from '../lib/gemini/geminiClient';
import { toAiAppError } from '../lib/gemini/aiFailure';
import {
  CONFIDENCE_FACTOR_KEYS,
  ConfidenceAssessment,
  ScoredImageKind,
  assessConfidence,
} from '../lib/extractionConfidence';
import { toInlineImage } from '../lib/inlineImage';
import { normaliseAiMicronutrients } from '../lib/aiMicronutrients';
import { MICRONUTRIENT_NAMES } from '../lib/micronutrientCatalog';
import {
  AiFoodItem,
  AiFoodReading,
  EXTRACTION_SYSTEM_INSTRUCTION,
  IMAGE_KINDS,
  MAX_PHOTO_ITEMS,
  MAX_REPORTED_MICRONUTRIENTS,
  aiFoodReadingSchema,
  buildExtractionPrompt,
} from '../lib/nutritionExtractionPrompt';
import { NutritionTotals, sumItemNutrition } from '../lib/foodItemTotals';
import { roundToTenth } from '../lib/numbers';
import { FOOD_ITEM_UNITS } from '../models/FoodEntry';
import { AppError } from '../middleware/errorHandler';
import { FoodEntryDraft, FoodItemInput, foodEntryDraftSchema } from '../schemas/foodEntry.schema';

/**
 * This file is the only place the photo extraction feature touches an AI
 * provider. Swapping Gemini out means replacing `RESPONSE_SCHEMA` and
 * `requestFoodReading`; the prompt, validation and normalisation stay as they are.
 */

/** Vision calls run slower than text ones, so they get a longer leash than the client default. */
const ATTEMPT_TIMEOUT_MS = 25 * 1000;
const TOTAL_BUDGET_MS = 45 * 1000;

/** How far label or estimate calories may drift from 4/4/9 macro energy before the user is warned. */
const MAX_ENERGY_MISMATCH = 0.2;
/** Below this, rounding alone produces large relative mismatches, so none are reported. */
const MIN_CALORIES_FOR_ENERGY_CHECK = 50;

const MICRONUTRIENT_ITEM_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', enum: [...MICRONUTRIENT_NAMES] },
    amount: { type: 'NUMBER' },
    unit: { type: 'STRING', enum: ['mg', 'mcg'] },
  },
  required: ['name', 'amount', 'unit'],
};

const FACTOR_READING_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    // The reason is generated first so the score follows from it rather than being justified afterwards.
    reason: { type: 'STRING' },
    score: { type: 'INTEGER', description: '0 to 100' },
  },
  required: ['reason', 'score'],
  propertyOrdering: ['reason', 'score'],
};

const FOOD_ITEM_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    unit: { type: 'STRING', enum: [...FOOD_ITEM_UNITS] },
    quantity: { type: 'NUMBER', description: 'total amount of this item, in its unit' },
    calories: { type: 'NUMBER', description: 'kcal for this item only' },
    proteinG: { type: 'NUMBER', description: 'grams for this item only' },
    carbG: { type: 'NUMBER', description: 'grams for this item only' },
    fatG: { type: 'NUMBER', description: 'grams for this item only' },
    micronutrients: {
      type: 'ARRAY',
      items: MICRONUTRIENT_ITEM_SCHEMA,
      maxItems: MAX_REPORTED_MICRONUTRIENTS,
    },
  },
  required: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG'],
  // The unit is chosen before the amount, so "2" is always read against "count" or "g".
  propertyOrdering: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG', 'micronutrients'],
};

/** Mirrors `aiFoodReadingSchema` in Gemini's schema dialect. */
const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    imageKind: { type: 'STRING', enum: [...IMAGE_KINDS] },
    unreadableReason: { type: 'STRING' },
    mealName: { type: 'STRING' },
    // No `maxItems`: Gemini rejects large caps on arrays of objects as too complex. The service trims instead.
    items: { type: 'ARRAY', items: FOOD_ITEM_SCHEMA },
    productNameVisible: { type: 'BOOLEAN' },
    descriptionStatesAmount: { type: 'BOOLEAN', description: 'false when there is no description' },
    confidenceFactors: {
      type: 'OBJECT',
      properties: Object.fromEntries(CONFIDENCE_FACTOR_KEYS.map((key) => [key, FACTOR_READING_SCHEMA])),
      required: [...CONFIDENCE_FACTOR_KEYS],
      propertyOrdering: [...CONFIDENCE_FACTOR_KEYS],
    },
    notes: { type: 'STRING' },
  },
  required: ['imageKind'],
  // Classification comes first so the model commits to "is this food at all"
  // before it starts producing numbers.
  propertyOrdering: [
    'imageKind',
    'unreadableReason',
    'mealName',
    'items',
    'productNameVisible',
    'descriptionStatesAmount',
    'confidenceFactors',
    'notes',
  ],
};

export interface ExtractionAnalysis {
  imageKind: ScoredImageKind;
  confidence: ConfidenceAssessment;
  /** The model's main assumption, in one sentence, or null when it gave none. */
  notes: string | null;
  /** Things the user should double-check before saving. */
  warnings: string[];
}

export interface NutritionExtraction {
  extraction: FoodEntryDraft;
  analysis: ExtractionAnalysis;
}

const PHOTO_FAILURE_COPY = {
  logLabel: 'NutritionExtraction',
  unavailableMessage:
    'Photo analysis is unavailable right now. Try again in a minute, or enter the meal manually.',
  // A request no key or model accepts is almost always an image the provider
  // cannot decode (corrupt, unusual encoding), not a transient fault.
  rejectedMessage:
    'This photo could not be processed. Try a different photo, or enter the meal manually.',
  rejectedCode: 'IMAGE_UNPROCESSABLE',
};

function unusableResponseError(): AppError {
  return new AppError(
    'The photo was analysed, but the result was incomplete. Try again, or enter the meal manually.',
    502,
    'AI_BAD_RESPONSE'
  );
}

async function requestFoodReading(image: InlineImage, description?: string): Promise<AiFoodReading> {
  let raw: unknown;

  try {
    raw = await generateStructuredJson({
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      prompt: buildExtractionPrompt(description),
      responseSchema: RESPONSE_SCHEMA,
      images: [image],
      attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
      totalBudgetMs: TOTAL_BUDGET_MS,
    });
  } catch (cause) {
    throw toAiAppError(cause, PHOTO_FAILURE_COPY);
  }

  const parsed = aiFoodReadingSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn('[NutritionExtraction] AI response failed validation:', parsed.error.issues);
    throw unusableResponseError();
  }

  return parsed.data;
}

/** Turns a "this is not a usable food photo" verdict into an error the user can act on. */
function assertFoodDetected(reading: AiFoodReading): void {
  if (reading.imageKind === 'not-food') {
    throw new AppError(
      reading.unreadableReason || 'No food or nutrition label was found in this photo.',
      422,
      'NO_FOOD_DETECTED'
    );
  }

  if (reading.imageKind === 'unclear') {
    throw new AppError(
      reading.unreadableReason ||
        'The photo is too blurry or dark to read. Try again in better light, closer up.',
      422,
      'IMAGE_UNCLEAR'
    );
  }
}

/** Counted pieces keep a tenth (half a roti is real); grams and millilitres round to whole units. */
function roundQuantity(item: AiFoodItem): number {
  return item.unit === 'count' ? roundToTenth(item.quantity) : Math.round(item.quantity);
}

function toDraftItem(item: AiFoodItem): FoodItemInput {
  return {
    name: item.name,
    quantity: roundQuantity(item),
    unit: item.unit,
    calories: Math.round(item.calories),
    macros: {
      proteinG: roundToTenth(item.proteinG),
      carbG: roundToTenth(item.carbG),
      fatG: roundToTenth(item.fatG),
    },
    micros: normaliseAiMicronutrients(item.micronutrients, MAX_REPORTED_MICRONUTRIENTS),
  };
}

/** Shapes a food reading into the same items a manual entry sends. */
function toDraft(reading: AiFoodReading): FoodEntryDraft {
  if (reading.items.length === 0) {
    console.warn('[NutritionExtraction] AI reading has no items:', reading);
    throw unusableResponseError();
  }

  if (reading.items.length > MAX_PHOTO_ITEMS) {
    console.warn(`[NutritionExtraction] Keeping the first ${MAX_PHOTO_ITEMS} of ${reading.items.length} items`);
  }

  const parsed = foodEntryDraftSchema.safeParse({
    name: reading.mealName,
    items: reading.items.slice(0, MAX_PHOTO_ITEMS).map(toDraftItem),
  });
  if (!parsed.success) {
    console.warn('[NutritionExtraction] Draft is outside food entry limits:', parsed.error.issues);
    throw unusableResponseError();
  }

  return parsed.data;
}

function macroCalories(totals: NutritionTotals): number {
  const { proteinG, carbG, fatG } = totals.macros;
  return proteinG * 4 + carbG * 4 + fatG * 9;
}

function hasEnergyMismatch(totals: NutritionTotals): boolean {
  const fromMacros = macroCalories(totals);
  const larger = Math.max(totals.calories, fromMacros);
  if (larger < MIN_CALORIES_FOR_ENERGY_CHECK) return false;
  return Math.abs(totals.calories - fromMacros) / larger > MAX_ENERGY_MISMATCH;
}

function findReviewWarnings(
  totals: NutritionTotals,
  reading: AiFoodReading,
  description?: string
): string[] {
  const warnings: string[] = [];
  const userStatedAmount = Boolean(description) && reading.descriptionStatesAmount;

  if (reading.imageKind === 'meal' && !userStatedAmount) {
    warnings.push('Amounts are estimated from the photo. Check the quantity of each item.');
  }

  if (hasEnergyMismatch(totals)) {
    warnings.push(
      `Calories (${Math.round(totals.calories)} kcal) and macros (about ${Math.round(macroCalories(totals))} kcal) do not agree. Check both.`
    );
  }

  return warnings;
}

function scoreConfidence(
  totals: NutritionTotals,
  reading: AiFoodReading,
  imageKind: ScoredImageKind,
  description?: string
): ConfidenceAssessment {
  if (!reading.confidenceFactors) {
    console.warn('[NutritionExtraction] AI reading has no confidence factors:', reading);
    throw unusableResponseError();
  }

  return assessConfidence(reading.confidenceFactors, {
    imageKind,
    productNameVisible: reading.productNameVisible,
    hasUserDescription: Boolean(description),
    descriptionStatesAmount: reading.descriptionStatesAmount,
    energyMismatch: hasEnergyMismatch(totals),
  });
}

/**
 * Reads nutrition from a food photo or nutrition label and returns a draft for
 * the user to review. Nothing is saved.
 *
 * @throws AppError with a `code` for every failure the user can act on:
 *   IMAGE_UNREADABLE, IMAGE_UNPROCESSABLE, NO_FOOD_DETECTED, IMAGE_UNCLEAR,
 *   AI_UNAVAILABLE and AI_BAD_RESPONSE.
 */
export async function extractNutritionFromImage(
  imageBytes: Buffer,
  description?: string
): Promise<NutritionExtraction> {
  const inlineImage = toInlineImage(imageBytes);
  const reading = await requestFoodReading(inlineImage, description);

  assertFoodDetected(reading);
  const imageKind = reading.imageKind as ScoredImageKind;
  const extraction = toDraft(reading);
  const totals = sumItemNutrition(extraction.items);

  return {
    extraction,
    analysis: {
      imageKind,
      confidence: scoreConfidence(totals, reading, imageKind, description),
      notes: reading.notes || null,
      warnings: findReviewWarnings(totals, reading, description),
    },
  };
}
