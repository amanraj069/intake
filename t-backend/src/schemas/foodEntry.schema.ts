import { z } from 'zod';
import { MEAL_TYPES, FOOD_ENTRY_SOURCES } from '../models/FoodEntry';
import { dateStringSchema, nonNegativeAmount, objectIdSchema } from './common.schema';

const MAX_CALORIES = 20000;
const MAX_MACRO_GRAMS = 2000;
const MAX_QUANTITY = 100000;
const MAX_MICRO_AMOUNT = 100000;
const MAX_MICRONUTRIENTS = 50;

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
    nonNegativeAmount('Nutrient amount', MAX_MICRO_AMOUNT)
  )
  .refine(
    (micros) => Object.keys(micros).length <= MAX_MICRONUTRIENTS,
    `At most ${MAX_MICRONUTRIENTS} micronutrients are allowed`
  );

const foodEntryFields = {
  mealType: z.enum(MEAL_TYPES, {
    errorMap: () => ({ message: `Meal type must be one of: ${MEAL_TYPES.join(', ')}` }),
  }),
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

export type CreateFoodEntryInput = z.infer<typeof createFoodEntrySchema>['body'];
export type UpdateFoodEntryInput = z.infer<typeof updateFoodEntrySchema>['body'];
