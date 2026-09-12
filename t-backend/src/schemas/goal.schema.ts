import { z } from 'zod';
import { nonNegativeAmount } from './common.schema';

const MAX_CALORIES = 20000;
const MAX_MACRO_GRAMS = 2000;
const MAX_WEIGHT_KG = 1000;

export const upsertGoalSchema = z.object({
  body: z.object({
    dailyCalorieTarget: nonNegativeAmount('Daily calorie target', MAX_CALORIES),
    proteinTargetG: nonNegativeAmount('Protein target', MAX_MACRO_GRAMS),
    carbTargetG: nonNegativeAmount('Carb target', MAX_MACRO_GRAMS),
    fatTargetG: nonNegativeAmount('Fat target', MAX_MACRO_GRAMS),
    weightGoalKg: nonNegativeAmount('Weight goal', MAX_WEIGHT_KG).optional(),
  }),
});

export type UpsertGoalInput = z.infer<typeof upsertGoalSchema>['body'];
