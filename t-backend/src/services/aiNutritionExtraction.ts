import {
  GeminiResponseSchema,
  InlineImage,
  generateStructuredJson,
} from '../lib/gemini/geminiClient';
import { GeminiRequestError, GeminiUnavailableError } from '../lib/gemini/geminiErrors';
import {
  CONFIDENCE_FACTOR_KEYS,
  ConfidenceAssessment,
  ScoredImageKind,
  assessConfidence,
} from '../lib/extractionConfidence';
import { detectImageType } from '../lib/imageSignature';
import { MICRONUTRIENT_CATALOG, MICRONUTRIENT_NAMES, toMilligrams } from '../lib/micronutrientCatalog';
import {
  AiFoodReading,
  AiMicronutrient,
  EXTRACTION_SYSTEM_INSTRUCTION,
  IMAGE_KINDS,
  MAX_REPORTED_MICRONUTRIENTS,
  aiFoodReadingSchema,
  buildExtractionPrompt,
} from '../lib/nutritionExtractionPrompt';
import { roundToDecimals, roundToTenth } from '../lib/numbers';
import { AppError } from '../middleware/errorHandler';
import { FoodEntryDraft, foodEntryDraftSchema } from '../schemas/foodEntry.schema';

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
const MICRONUTRIENT_DECIMALS = 3;

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

/** Mirrors `aiFoodReadingSchema` in Gemini's schema dialect. */
const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    imageKind: { type: 'STRING', enum: [...IMAGE_KINDS] },
    unreadableReason: { type: 'STRING' },
    foodName: { type: 'STRING' },
    quantity: { type: 'NUMBER', description: 'number of servings shown' },
    servingWeightG: { type: 'NUMBER', description: 'grams per serving' },
    calories: { type: 'NUMBER', description: 'kcal for the whole portion' },
    proteinG: { type: 'NUMBER', description: 'grams for the whole portion' },
    carbG: { type: 'NUMBER', description: 'grams for the whole portion' },
    fatG: { type: 'NUMBER', description: 'grams for the whole portion' },
    micronutrients: {
      type: 'ARRAY',
      items: MICRONUTRIENT_ITEM_SCHEMA,
      maxItems: MAX_REPORTED_MICRONUTRIENTS,
    },
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
    'foodName',
    'quantity',
    'servingWeightG',
    'calories',
    'proteinG',
    'carbG',
    'fatG',
    'micronutrients',
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

/** The bytes decide the media type, not the client's declared Content-Type. */
function toInlineImage(imageBytes: Buffer): InlineImage {
  const detectedType = detectImageType(imageBytes);

  if (!detectedType) {
    throw new AppError(
      'That file is not a readable image. Try a JPEG or PNG photo.',
      422,
      'IMAGE_UNREADABLE'
    );
  }

  return { mimeType: detectedType, data: imageBytes };
}

function toProviderError(cause: unknown): unknown {
  if (cause instanceof GeminiUnavailableError) {
    console.error('[NutritionExtraction] AI unavailable:', cause.message);
    return new AppError(
      'Photo analysis is unavailable right now. Try again in a minute, or enter the meal manually.',
      503,
      'AI_UNAVAILABLE'
    );
  }

  // A request no key or model accepts is almost always an image the provider
  // cannot decode (corrupt, unusual encoding), not a transient fault.
  if (cause instanceof GeminiRequestError && cause.kind === 'invalid-request') {
    console.error('[NutritionExtraction] AI rejected the request:', cause.message);
    return new AppError(
      'This photo could not be processed. Try a different photo, or enter the meal manually.',
      422,
      'IMAGE_UNPROCESSABLE'
    );
  }

  return cause;
}

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
    throw toProviderError(cause);
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

/**
 * Keeps catalog nutrients only, converted to milligrams, and at most the first
 * few. The model lists the most significant first, so the cap trims the least
 * important. The response schema already restricts names and length, so
 * anything dropped here is logged as a sign the model ignored it.
 */
function normaliseMicronutrients(items: readonly AiMicronutrient[]): FoodEntryDraft['micros'] {
  const micros: NonNullable<FoodEntryDraft['micros']> = {};
  const knownNames = new Set(MICRONUTRIENT_CATALOG.map((nutrient) => nutrient.name));

  for (const item of items) {
    if (!knownNames.has(item.name)) {
      console.warn(`[NutritionExtraction] Ignoring unknown micronutrient "${item.name}"`);
      continue;
    }

    const amountMg = roundToDecimals(toMilligrams(item.amount, item.unit), MICRONUTRIENT_DECIMALS);
    if (amountMg <= 0 || micros[item.name]) continue;

    micros[item.name] = { amount: amountMg, unit: 'mg' };
    if (Object.keys(micros).length === MAX_REPORTED_MICRONUTRIENTS) break;
  }

  return micros;
}

/**
 * Shapes a food reading into the same fields a manual entry sends. The unit is
 * written as grams per serving (`"150g"`), the convention the meal form uses,
 * so a draft reopens in the form exactly like a saved entry does.
 */
function toDraft(reading: AiFoodReading): FoodEntryDraft {
  const { foodName, servingWeightG, calories, proteinG, carbG, fatG } = reading;
  const hasNutrition = [calories, proteinG, carbG, fatG].every((value) => value !== undefined);

  if (!foodName || !servingWeightG || !hasNutrition) {
    console.warn('[NutritionExtraction] AI reading is missing required fields:', reading);
    throw unusableResponseError();
  }

  const servings = reading.quantity && reading.quantity > 0 ? roundToTenth(reading.quantity) : 1;

  const candidate = {
    foodName,
    quantity: servings,
    quantityUnit: `${Math.round(servingWeightG)}g`,
    calories: Math.round(calories ?? 0),
    macros: {
      proteinG: roundToTenth(proteinG ?? 0),
      carbG: roundToTenth(carbG ?? 0),
      fatG: roundToTenth(fatG ?? 0),
    },
    micros: normaliseMicronutrients(reading.micronutrients),
  };

  const parsed = foodEntryDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn('[NutritionExtraction] Draft is outside food entry limits:', parsed.error.issues);
    throw unusableResponseError();
  }

  return parsed.data;
}

function macroCalories(draft: FoodEntryDraft): number {
  const { proteinG, carbG, fatG } = draft.macros;
  return proteinG * 4 + carbG * 4 + fatG * 9;
}

function hasEnergyMismatch(draft: FoodEntryDraft): boolean {
  const fromMacros = macroCalories(draft);
  const larger = Math.max(draft.calories, fromMacros);
  if (larger < MIN_CALORIES_FOR_ENERGY_CHECK) return false;
  return Math.abs(draft.calories - fromMacros) / larger > MAX_ENERGY_MISMATCH;
}

function findReviewWarnings(
  draft: FoodEntryDraft,
  reading: AiFoodReading,
  description?: string
): string[] {
  const warnings: string[] = [];
  const userStatedAmount = Boolean(description) && reading.descriptionStatesAmount;

  if (reading.imageKind === 'meal' && !userStatedAmount) {
    warnings.push('Portion size is estimated from the photo. Check the amount in grams.');
  }

  if (hasEnergyMismatch(draft)) {
    warnings.push(
      `Calories (${draft.calories} kcal) and macros (about ${Math.round(macroCalories(draft))} kcal) do not agree. Check both.`
    );
  }

  return warnings;
}

function scoreConfidence(
  draft: FoodEntryDraft,
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
    energyMismatch: hasEnergyMismatch(draft),
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

  return {
    extraction,
    analysis: {
      imageKind,
      confidence: scoreConfidence(extraction, reading, imageKind, description),
      notes: reading.notes || null,
      warnings: findReviewWarnings(extraction, reading, description),
    },
  };
}
