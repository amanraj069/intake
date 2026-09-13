import type { ActivityLevel, BiologicalSex, IBodyProfile } from '../models/User';
import { roundToTenth } from './numbers';

/**
 * Deterministic body and energy maths. Used on its own when the AI is
 * unavailable, and as the baseline an AI answer is sanity-checked against.
 */

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';
export type WeightDirection = 'lose' | 'maintain' | 'gain';

export interface DailyTargets {
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

/** Within this many kg of the goal, the user is treated as maintaining. */
const MAINTENANCE_TOLERANCE_KG = 1;
/** Roughly 0.5 kg a week, a pace most guidance treats as sustainable. */
const DEFICIT_KCAL = 500;
const SURPLUS_KCAL = 300;
/** Protein grams per kg of body weight, higher while losing to protect muscle. */
const PROTEIN_G_PER_KG: Record<WeightDirection, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };
const FAT_SHARE_OF_CALORIES = 0.25;
const MIN_CALORIES: Record<BiologicalSex, number> = { male: 1500, female: 1200 };

const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const;

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return roundToTenth(weightKg / (heightM * heightM));
}

export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function weightDirection(profile: Pick<IBodyProfile, 'weightKg' | 'goalWeightKg'>): WeightDirection {
  const difference = profile.goalWeightKg - profile.weightKg;
  if (Math.abs(difference) <= MAINTENANCE_TOLERANCE_KG) return 'maintain';
  return difference < 0 ? 'lose' : 'gain';
}

/** Mifflin-St Jeor resting energy, the most accurate of the common equations for adults. */
function basalMetabolicRate(profile: IBodyProfile): number {
  const sexOffset = profile.sex === 'male' ? 5 : -161;
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
}

function calorieTarget(profile: IBodyProfile, direction: WeightDirection): number {
  const maintenance = basalMetabolicRate(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const adjustment = direction === 'lose' ? -DEFICIT_KCAL : direction === 'gain' ? SURPLUS_KCAL : 0;
  return Math.max(MIN_CALORIES[profile.sex], Math.round(maintenance + adjustment));
}

export function estimateDailyTargets(profile: IBodyProfile): DailyTargets {
  const direction = weightDirection(profile);
  const calories = calorieTarget(profile, direction);

  const proteinG = Math.round(profile.weightKg * PROTEIN_G_PER_KG[direction]);
  const fatG = Math.round((calories * FAT_SHARE_OF_CALORIES) / KCAL_PER_G.fat);
  const remainingKcal = calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  const carbG = Math.max(0, Math.round(remainingKcal / KCAL_PER_G.carb));

  return {
    dailyCalorieTarget: calories,
    proteinTargetG: proteinG,
    carbTargetG: carbG,
    fatTargetG: fatG,
  };
}

/** Calories implied by a set of macro grams, for checking they agree with the stated total. */
export function caloriesFromMacros(targets: Omit<DailyTargets, 'dailyCalorieTarget'>): number {
  return (
    targets.proteinTargetG * KCAL_PER_G.protein +
    targets.carbTargetG * KCAL_PER_G.carb +
    targets.fatTargetG * KCAL_PER_G.fat
  );
}
