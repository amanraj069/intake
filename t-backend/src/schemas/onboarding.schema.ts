import { z } from 'zod';
import { ACTIVITY_LEVELS, BIOLOGICAL_SEXES } from '../models/User';
import { dailyTargetsSchema } from './goal.schema';

/**
 * Bounds are deliberately adult-human plausible rather than merely positive:
 * the energy equations are meaningless outside them, and an AI prompt fed
 * "height: 3 cm" will happily return nonsense.
 */
const boundedNumber = (label: string, min: number, max: number, unit: string) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .min(min, `${label} must be at least ${min} ${unit}`)
    .max(max, `${label} must be at most ${max} ${unit}`);

export const bodyProfileSchema = z.object({
  weightKg: boundedNumber('Weight', 30, 300, 'kg'),
  heightCm: boundedNumber('Height', 120, 230, 'cm'),
  goalWeightKg: boundedNumber('Goal weight', 30, 300, 'kg'),
  age: boundedNumber('Age', 16, 100, 'years').int('Age must be a whole number'),
  sex: z.enum(BIOLOGICAL_SEXES, { errorMap: () => ({ message: 'Choose male or female' }) }),
  activityLevel: z.enum(ACTIVITY_LEVELS, {
    errorMap: () => ({ message: 'Choose an activity level' }),
  }),
});

export const generatePlanSchema = z.object({
  body: bodyProfileSchema,
});

export const completeOnboardingSchema = z.object({
  body: z.object({
    profile: bodyProfileSchema,
    targets: dailyTargetsSchema,
  }),
});

export type BodyProfileInput = z.infer<typeof bodyProfileSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>['body'];
