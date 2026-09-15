import { toAiAppError } from '../lib/gemini/aiFailure';
import { GeminiResponseSchema, generateStructuredJson } from '../lib/gemini/geminiClient';
import {
  AI_MEAL_TYPES,
  AiDiaryReading,
  DIARY_SYSTEM_INSTRUCTION,
  DOCUMENT_KINDS,
  MAX_IMPORT_ROWS,
  aiDiaryReadingSchema,
  buildDiaryPrompt,
} from '../lib/foodDiaryImportPrompt';
import { ImportPreviewRow, toPreviewRow } from '../lib/foodDiaryRows';
import { splitCombinedDishes } from './dishSplit.service';
import { fillMissingDishNutrition } from './dishNutritionFill.service';
import { extractPdfText } from '../lib/pdfText';
import { AppError } from '../middleware/errorHandler';
import { FOOD_ITEM_UNITS } from '../models/FoodEntry';

/**
 * PDF import reaches the AI provider through the same client as photo
 * extraction. Swapping Gemini out means replacing `RESPONSE_SCHEMA` and
 * `requestDiaryReading`; the prompt, validation and row shaping stay as they are.
 */

/** A long diary is a lot of output to generate, so each attempt gets more time than a photo does. */
const ATTEMPT_TIMEOUT_MS = 50 * 1000;
const TOTAL_BUDGET_MS = 80 * 1000;

const PDF_FAILURE_COPY = {
  logLabel: 'FoodDiaryPreview',
  unavailableMessage: 'PDF import is unavailable right now. Try again in a minute.',
  rejectedMessage: 'This diary could not be processed. Try exporting the PDF again.',
  rejectedCode: 'PDF_UNPROCESSABLE',
};

const nullable = (schema: GeminiResponseSchema): GeminiResponseSchema => ({ ...schema, nullable: true });

const ITEM_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    name: nullable({ type: 'STRING' }),
    unit: { type: 'STRING', enum: [...FOOD_ITEM_UNITS] },
    quantity: nullable({ type: 'NUMBER', description: 'total amount of this item, in its unit' }),
    quantityEstimated: { type: 'BOOLEAN' },
    calories: nullable({ type: 'NUMBER' }),
    proteinG: nullable({ type: 'NUMBER' }),
    carbG: nullable({ type: 'NUMBER' }),
    fatG: nullable({ type: 'NUMBER' }),
  },
  required: ['name', 'unit', 'quantity', 'quantityEstimated', 'calories', 'proteinG', 'carbG', 'fatG'],
  // The unit is chosen before the amount, so "2" is always read against "count" or "g".
  propertyOrdering: ['name', 'unit', 'quantity', 'quantityEstimated', 'calories', 'proteinG', 'carbG', 'fatG'],
};

const ROW_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    sourceText: { type: 'STRING' },
    date: nullable({ type: 'STRING', description: 'YYYY-MM-DD' }),
    mealType: { type: 'STRING', enum: [...AI_MEAL_TYPES] },
    name: nullable({ type: 'STRING' }),
    items: { type: 'ARRAY', items: ITEM_SCHEMA },
    nutritionSplitEstimated: { type: 'BOOLEAN' },
    uncertainReason: nullable({ type: 'STRING' }),
  },
  required: ['sourceText', 'date', 'mealType', 'name', 'items', 'nutritionSplitEstimated'],
  // The source line comes first so every value is read from text the model has already committed to.
  propertyOrdering: ['sourceText', 'date', 'mealType', 'name', 'items', 'nutritionSplitEstimated', 'uncertainReason'],
};

/** Mirrors `aiDiaryReadingSchema` in Gemini's schema dialect. */
const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    documentKind: { type: 'STRING', enum: [...DOCUMENT_KINDS] },
    notFoodDiaryReason: nullable({ type: 'STRING' }),
    // No `maxItems` here: Gemini rejects the whole request as too complex when a
    // large cap sits on an array of objects this size. The cap is applied below.
    rows: { type: 'ARRAY', items: ROW_SCHEMA },
  },
  required: ['documentKind', 'rows'],
  propertyOrdering: ['documentKind', 'notFoodDiaryReason', 'rows'],
};

export interface FoodDiaryPreview {
  pageCount: number;
  rows: ImportPreviewRow[];
  /** Problems with the document as a whole, rather than with one row. */
  warnings: string[];
}

async function requestDiaryReading(diaryText: string, pageCount: number): Promise<AiDiaryReading> {
  let raw: unknown;

  try {
    raw = await generateStructuredJson({
      systemInstruction: DIARY_SYSTEM_INSTRUCTION,
      prompt: buildDiaryPrompt(diaryText, pageCount),
      responseSchema: RESPONSE_SCHEMA,
      attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
      totalBudgetMs: TOTAL_BUDGET_MS,
    });
  } catch (cause) {
    throw toAiAppError(cause, PDF_FAILURE_COPY);
  }

  const parsed = aiDiaryReadingSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn('[FoodDiaryPreview] AI response failed validation:', parsed.error.issues);
    throw new AppError(
      'The diary was read, but the result was incomplete. Try again.',
      502,
      'AI_BAD_RESPONSE'
    );
  }

  return parsed.data;
}

function assertHasDiaryRows(reading: AiDiaryReading): void {
  if (reading.documentKind === 'not-food-diary') {
    throw new AppError(
      reading.notFoodDiaryReason || 'This PDF does not look like a food diary.',
      422,
      'NOT_A_FOOD_DIARY'
    );
  }

  if (reading.rows.length === 0) {
    throw new AppError('No food entries were found in this PDF.', 422, 'NO_ENTRIES_FOUND');
  }
}

function findDocumentWarnings(rows: readonly ImportPreviewRow[], foundCount: number): string[] {
  const warnings: string[] = [];

  if (foundCount > rows.length) {
    warnings.push(
      `The PDF has ${foundCount} entries, but at most ${MAX_IMPORT_ROWS} can be imported at once. Only the first ${MAX_IMPORT_ROWS} are shown: import the rest from a smaller PDF.`
    );
  }

  const flaggedCount = rows.filter((row) => row.status === 'needs-review').length;
  if (flaggedCount > 0) {
    warnings.push(`${flaggedCount} of ${rows.length} rows need a look before they can be imported.`);
  }

  return warnings;
}

/**
 * Reads a food diary PDF into rows for the user to review. Nothing is saved.
 *
 * @throws AppError with a `code` for every failure the user can act on:
 *   PDF_UNREADABLE, PDF_ENCRYPTED, PDF_TOO_LONG, PDF_NO_TEXT, PDF_UNPROCESSABLE,
 *   NOT_A_FOOD_DIARY, NO_ENTRIES_FOUND, AI_UNAVAILABLE and AI_BAD_RESPONSE.
 */
export async function previewFoodDiaryImport(pdfBytes: Buffer): Promise<FoodDiaryPreview> {
  const { text, pageCount } = await extractPdfText(pdfBytes);
  const reading = await requestDiaryReading(text, pageCount);

  assertHasDiaryRows(reading);
  const split = await splitCombinedDishes(reading.rows.slice(0, MAX_IMPORT_ROWS));
  const filled = await fillMissingDishNutrition(split.rows);
  const rows = filled.rows.map(toPreviewRow);
  const warnings = findDocumentWarnings(rows, reading.rows.length);

  const extraWarnings = [split.warning, filled.warning].filter((w): w is string => Boolean(w));
  return { pageCount, rows, warnings: [...warnings, ...extraWarnings] };
}
