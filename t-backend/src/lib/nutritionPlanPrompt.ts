import { z } from 'zod';
import type { GeminiResponseSchema, StructuredGenerationRequest } from './gemini/geminiClient';
import type { BmiCategory, DailyTargets, WeightDirection } from './bodyMetrics';
import type { BodyProfileInput } from '../schemas/onboarding.schema';

const MAX_RATIONALE_LENGTH = 400;

const SYSTEM_INSTRUCTION = `You are a registered dietitian setting daily nutrition targets for a calorie-tracking app.
Base energy needs on the Mifflin-St Jeor equation and the stated activity level.
Pace weight change safely: at most about 0.5-1% of body weight per week.
Never go below 1200 kcal for women or 1500 kcal for men.
Protein, carbs and fat must add up to the calorie target (4, 4 and 9 kcal per gram).
Reply only with JSON matching the schema. Keep the rationale to two short, encouraging sentences addressed to the user, without medical disclaimers.`;

/** Mirrors `aiPlanSchema` below in Gemini's schema dialect, which constrains generation itself. */
const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    dailyCalorieTarget: { type: 'INTEGER', description: 'kcal per day' },
    proteinTargetG: { type: 'INTEGER', description: 'grams of protein per day' },
    carbTargetG: { type: 'INTEGER', description: 'grams of carbohydrate per day' },
    fatTargetG: { type: 'INTEGER', description: 'grams of fat per day' },
    rationale: { type: 'STRING', description: 'two short sentences explaining the plan' },
  },
  required: ['dailyCalorieTarget', 'proteinTargetG', 'carbTargetG', 'fatTargetG', 'rationale'],
  propertyOrdering: ['dailyCalorieTarget', 'proteinTargetG', 'carbTargetG', 'fatTargetG', 'rationale'],
};

/** The schema constrains generation, but the model is still untrusted input. */
export const aiPlanSchema = z.object({
  dailyCalorieTarget: z.number().int().min(1000).max(6000),
  proteinTargetG: z.number().int().min(20).max(400),
  carbTargetG: z.number().int().min(0).max(900),
  fatTargetG: z.number().int().min(20).max(300),
  rationale: z.string().trim().min(1).max(MAX_RATIONALE_LENGTH),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;

interface PlanPromptContext {
  profile: BodyProfileInput;
  bmi: number;
  bmiCategory: BmiCategory;
  direction: WeightDirection;
  baseline: DailyTargets;
}

export function buildNutritionPlanRequest(context: PlanPromptContext): StructuredGenerationRequest {
  const { profile, bmi, bmiCategory, direction, baseline } = context;

  const prompt = `Create daily targets for this person.
- Sex: ${profile.sex}
- Age: ${profile.age} years
- Height: ${profile.heightCm} cm
- Current weight: ${profile.weightKg} kg
- Goal weight: ${profile.goalWeightKg} kg (they want to ${direction} weight)
- Activity level: ${profile.activityLevel}
- BMI: ${bmi} (${bmiCategory})

A formula-based starting point is ${baseline.dailyCalorieTarget} kcal, ${baseline.proteinTargetG} g protein, ${baseline.carbTargetG} g carbs, ${baseline.fatTargetG} g fat. Adjust it only where your judgement differs.`;

  return { systemInstruction: SYSTEM_INSTRUCTION, prompt, responseSchema: RESPONSE_SCHEMA };
}
