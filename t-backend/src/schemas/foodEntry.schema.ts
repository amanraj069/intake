import { z } from 'zod';
import { MEAL_TYPES, FOOD_ENTRY_SOURCES } from '../models/FoodEntry';
import { countCalendarDays } from '../lib/calendarDay';
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

const foodEntryFields = {
  mealType: mealTypeSchema,
  foodName: z.string().trim().min(1, 'Food name is required').max(200, 'Food name is too long'),
  quantity: nonNegativeAmount('Quantity', MAX_QUANTITY),
  quantityUnit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit is too long'),
  calories: nonNegativeAmount('Calories', MAX_CALORIES),
  macros: macrosSchema,
  micros: microsSchema.optional(),
  date: dateStringSchema,
  source: z.enum(FOOD_ENTRY_SOURCES).optional(),
};

export const createFoodEntrySchema = z.object({
  body: z.object(foodEntryFields),
});

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
export type UpdateFoodEntryInput = z.infer<typeof updateFoodEntrySchema>['body'];
export type ListFoodEntriesQuery = z.infer<typeof listFoodEntriesSchema>['query'];
export type FoodEntrySeriesQuery = z.infer<typeof foodEntrySeriesSchema>['query'];
