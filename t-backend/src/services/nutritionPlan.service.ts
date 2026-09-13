import { generateStructuredJson } from '../lib/gemini/geminiClient';
import { GeminiUnavailableError } from '../lib/gemini/geminiErrors';
import {
  BmiCategory,
  DailyTargets,
  WeightDirection,
  calculateBmi,
  caloriesFromMacros,
  classifyBmi,
  estimateDailyTargets,
  weightDirection,
} from '../lib/bodyMetrics';
import { AiPlan, aiPlanSchema, buildNutritionPlanRequest } from '../lib/nutritionPlanPrompt';
import type { BodyProfileInput } from '../schemas/onboarding.schema';

/** How far the AI may stray from the formula before its answer is distrusted. */
const MAX_CALORIE_DEVIATION = 0.25;
/** How far the macro grams may disagree with the AI's own calorie total. */
const MAX_MACRO_MISMATCH = 0.1;

export type PlanSource = 'ai' | 'formula';

export interface NutritionPlan {
  bmi: number;
  bmiCategory: BmiCategory;
  goalBmi: number;
  direction: WeightDirection;
  targets: DailyTargets;
  rationale: string;
  /** `formula` means the AI could not be reached or gave an implausible answer. */
  source: PlanSource;
}

const FORMULA_RATIONALE: Record<WeightDirection, string> = {
  lose: 'These targets set a moderate daily deficit from your estimated energy needs, with extra protein to protect muscle while you lose weight.',
  maintain: 'These targets match your estimated energy needs so your weight stays steady, with a balanced split across protein, carbs and fat.',
  gain: 'These targets add a modest daily surplus to your estimated energy needs, with ample protein to support gaining weight steadily.',
};

function isPlausible(plan: AiPlan, baseline: DailyTargets): boolean {
  const calorieDeviation =
    Math.abs(plan.dailyCalorieTarget - baseline.dailyCalorieTarget) / baseline.dailyCalorieTarget;
  const macroMismatch =
    Math.abs(caloriesFromMacros(plan) - plan.dailyCalorieTarget) / plan.dailyCalorieTarget;

  return calorieDeviation <= MAX_CALORIE_DEVIATION && macroMismatch <= MAX_MACRO_MISMATCH;
}

/**
 * Returns the AI's plan when it is reachable and sensible, otherwise null. Every
 * reason for returning null is logged: the caller degrades to the formula, but
 * the failure itself is never invisible.
 */
async function requestAiPlan(
  profile: BodyProfileInput,
  context: Omit<Parameters<typeof buildNutritionPlanRequest>[0], 'profile'>
): Promise<AiPlan | null> {
  try {
    const raw = await generateStructuredJson(buildNutritionPlanRequest({ profile, ...context }));
    const parsed = aiPlanSchema.safeParse(raw);

    if (!parsed.success) {
      console.warn('[NutritionPlan] AI response failed validation:', parsed.error.issues);
      return null;
    }
    if (!isPlausible(parsed.data, context.baseline)) {
      console.warn('[NutritionPlan] AI plan was too far from the formula baseline:', parsed.data);
      return null;
    }
    return parsed.data;
  } catch (cause) {
    const label = cause instanceof GeminiUnavailableError ? 'AI unavailable' : 'AI request failed';
    console.error(`[NutritionPlan] ${label}, using the formula instead:`, cause);
    return null;
  }
}

/**
 * Derives BMI and daily calorie and macro targets from a body profile. The
 * formula result is always computed first: it is the fallback when the AI is
 * down, and the yardstick an AI answer must fall near to be trusted.
 */
export async function generateNutritionPlan(profile: BodyProfileInput): Promise<NutritionPlan> {
  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const bmiCategory = classifyBmi(bmi);
  const direction = weightDirection(profile);
  const baseline = estimateDailyTargets(profile);
  const goalBmi = calculateBmi(profile.goalWeightKg, profile.heightCm);

  const aiPlan = await requestAiPlan(profile, { bmi, bmiCategory, direction, baseline });
  const shared = { bmi, bmiCategory, goalBmi, direction };

  if (!aiPlan) {
    return { ...shared, targets: baseline, rationale: FORMULA_RATIONALE[direction], source: 'formula' };
  }

  const { rationale, ...targets } = aiPlan;
  return { ...shared, targets, rationale, source: 'ai' };
}
