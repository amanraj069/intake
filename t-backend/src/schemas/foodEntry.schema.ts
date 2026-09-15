import { z } from 'zod';
import { FOOD_ENTRY_SOURCES, FOOD_ITEM_UNITS, MEAL_TYPES } from '../models/FoodEntry';
import { countCalendarDays } from '../lib/calendarDay';
import { MAX_ENTRY_NAME_LENGTH } from '../lib/foodEntryName';
import {
  calendarDaySchema,
  dateStringSchema,
  nonNegativeAmount,
  objectIdSchema,
  paginationQueryFields,
} from './common.schema';

const MAX_CALORIES = 20000;
const MAX_MACRO_GRAMS = 2000;
const MAX_QUANTITY = 100000;
const MAX_MICRO_AMOUNT = 100000;
const MAX_MICRONUTRIENTS = 50;
/** Enough for a thali or a buffet plate, small enough that one entry stays one meal. */
export const MAX_ITEMS_PER_ENTRY = 30;
/** Bounds the day-by-day series so one request cannot ask for years of rows. */
const MAX_SERIES_DAYS = 92;

const mealTypeSchema = z.enum(MEAL_TYPES, {
  errorMap: () => ({ message: `Meal type must be one of: ${MEAL_TYPES.join(', ')}` }),
});

const macrosSchema = z.object({
  proteinG: nonNegativeAmount('Protein', MAX_MACRO_GRAMS),
  carbG: nonNegativeAmount('Carbs', MAX_MACRO_GRAMS),
  fatG: nonNegativeAmount('Fat', MAX_MACRO_GRAMS),
});

/**
 * Open-ended nutrient name to amount map. Names are free-form because the set of
 * tracked micronutrients differs per food and per data source.
 */
const microsSchema = z
  .record(
    z.string().trim().min(1, 'Nutrient name is required').max(60, 'Nutrient name is too long'),
    z.object({
      amount: nonNegativeAmount('Nutrient amount', MAX_MICRO_AMOUNT),
      unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit is too long'),
    })
  )
  .refine(
    (micros) => Object.keys(micros).length <= MAX_MICRONUTRIENTS,
    `At most ${MAX_MICRONUTRIENTS} micronutrients are allowed`
  );

const foodItemUnitSchema = z.enum(FOOD_ITEM_UNITS, {
  errorMap: () => ({ message: 'Unit must be g, ml or count' }),
});

/** One component of a meal: its amount, and the nutrition of exactly that amount. */
export const foodItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(200, 'Item name is too long'),
  quantity: nonNegativeAmount('Quantity', MAX_QUANTITY),
  unit: foodItemUnitSchema,
  calories: nonNegativeAmount('Calories', MAX_CALORIES),
  macros: macrosSchema,
  micros: microsSchema.optional(),
});

const foodItemsSchema = z
  .array(foodItemSchema, { invalid_type_error: 'Items must be a list' })
  .min(1, 'Add at least one item')
  .max(MAX_ITEMS_PER_ENTRY, `At most ${MAX_ITEMS_PER_ENTRY} items are allowed in one entry`);

/**
 * Totals are not accepted from the client: the service always sums them from
 * the items, so an entry's numbers can never disagree with what it contains.
 */
/** Optional everywhere: a blank or missing name means "call it by its items". */
const entryNameSchema = z
  .string()
  .trim()
  .max(MAX_ENTRY_NAME_LENGTH, 'Meal name is too long')
  .optional()
  .transform((name) => name || undefined);

const foodEntryFields = {
  mealType: mealTypeSchema,
  name: entryNameSchema,
  items: foodItemsSchema,
  date: dateStringSchema,
  source: z.enum(FOOD_ENTRY_SOURCES).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']).optional(),
  extractionAnalysis: z.any().optional(),
  imageUrl: z.string().url('Invalid image URL').max(2000).optional(),
  imagePublicId: z.string().trim().max(200).optional(),
};

export const createFoodEntrySchema = z.object({
  body: z.object(foodEntryFields),
});

/**
 * The items of an entry, without when or at which meal it was eaten. An AI
 * extraction must satisfy it, so a draft the user accepts unchanged can always
 * be saved.
 */
export const foodEntryDraftSchema = z.object({ name: entryNameSchema, items: foodItemsSchema });

export const updateFoodEntrySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      ...foodEntryFields,
      // `date` is a required string on create, so re-declare it as optional here
      // rather than making it optional everywhere.
      date: dateStringSchema.optional(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
      path: ['fields'],
    }),
});

export const foodEntryIdSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const listFoodEntriesSchema = z.object({
  query: z
    .object({
      startDate: calendarDaySchema.optional(),
      endDate: calendarDaySchema.optional(),
      mealType: mealTypeSchema.optional(),
      ...paginationQueryFields,
    })
    // Day strings in `YYYY-MM-DD` form sort correctly as plain strings, so no
    // Date conversion is needed to compare the two bounds.
    .refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
      message: 'Start date must not be after end date',
      path: ['startDate'],
    }),
});

export const foodEntrySummarySchema = z.object({
  query: z.object({ date: calendarDaySchema.optional() }),
});

export const foodEntrySeriesSchema = z.object({
  query: z
    .object({
      startDate: calendarDaySchema,
      endDate: calendarDaySchema,
    })
    .refine((query) => query.startDate <= query.endDate, {
      message: 'Start date must not be after end date',
      path: ['startDate'],
    })
    .refine((query) => countCalendarDays(query.startDate, query.endDate) <= MAX_SERIES_DAYS, {
      message: `A range may span at most ${MAX_SERIES_DAYS} days`,
      path: ['endDate'],
    }),
});

export type CreateFoodEntryInput = z.infer<typeof createFoodEntrySchema>['body'];
export type FoodEntryDraft = z.infer<typeof foodEntryDraftSchema>;
export type FoodItemInput = z.infer<typeof foodItemSchema>;
export type UpdateFoodEntryInput = z.infer<typeof updateFoodEntrySchema>['body'];
export type ListFoodEntriesQuery = z.infer<typeof listFoodEntriesSchema>['query'];
export type FoodEntrySeriesQuery = z.infer<typeof foodEntrySeriesSchema>['query'];
