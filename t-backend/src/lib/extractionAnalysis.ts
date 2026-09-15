import { ConfidenceAssessment, FactorReadings, ScoredImageKind, assessConfidence } from './extractionConfidence';
import { NutritionTotals, sumItemNutrition } from './foodItemTotals';
import type { FoodItemInput } from '../schemas/foodEntry.schema';

/** How far label or estimate calories may drift from 4/4/9 macro energy before the user is warned. */
const MAX_ENERGY_MISMATCH = 0.2;
/** Below this, rounding alone produces large relative mismatches, so none are reported. */
const MIN_CALORIES_FOR_ENERGY_CHECK = 50;

export interface ExtractionAnalysis {
  imageKind: ScoredImageKind;
  confidence: ConfidenceAssessment;
  /** The model's main assumption, in one sentence, or null when it gave none. */
  notes: string | null;
  /** Things the user should double-check before saving. */
  warnings: string[];
}

/**
 * What a model reported about a food photo beyond its items. Both photo
 * extraction and the chat assistant produce one, so a meal read from a photo
 * is scored the same way whichever of them read it.
 */
export interface PhotoReading {
  imageKind: ScoredImageKind;
  confidenceFactors: FactorReadings;
  productNameVisible: boolean;
  descriptionStatesAmount: boolean;
  notes?: string;
  /** The user wrote something alongside the photo, which may state how much they ate. */
  hasUserDescription: boolean;
}

function macroCalories(totals: NutritionTotals): number {
  const { proteinG, carbG, fatG } = totals.macros;
  return proteinG * 4 + carbG * 4 + fatG * 9;
}

function hasEnergyMismatch(totals: NutritionTotals): boolean {
  const fromMacros = macroCalories(totals);
  const larger = Math.max(totals.calories, fromMacros);
  if (larger < MIN_CALORIES_FOR_ENERGY_CHECK) return false;
  return Math.abs(totals.calories - fromMacros) / larger > MAX_ENERGY_MISMATCH;
}

function findReviewWarnings(totals: NutritionTotals, reading: PhotoReading): string[] {
  const warnings: string[] = [];
  const userStatedAmount = reading.hasUserDescription && reading.descriptionStatesAmount;

  if (reading.imageKind === 'meal' && !userStatedAmount) {
    warnings.push('Amounts are estimated from the photo. Check the quantity of each item.');
  }

  if (hasEnergyMismatch(totals)) {
    warnings.push(
      `Calories (${Math.round(totals.calories)} kcal) and macros (about ${Math.round(macroCalories(totals))} kcal) do not agree. Check both.`
    );
  }

  return warnings;
}

/** The confidence breakdown, warnings and note stored with a meal read from a photo. */
export function buildExtractionAnalysis(items: readonly FoodItemInput[], reading: PhotoReading): ExtractionAnalysis {
  const totals = sumItemNutrition(items);

  return {
    imageKind: reading.imageKind,
    confidence: assessConfidence(reading.confidenceFactors, {
      imageKind: reading.imageKind,
      productNameVisible: reading.productNameVisible,
      hasUserDescription: reading.hasUserDescription,
      descriptionStatesAmount: reading.descriptionStatesAmount,
      energyMismatch: hasEnergyMismatch(totals),
    }),
    notes: reading.notes || null,
    warnings: findReviewWarnings(totals, reading),
  };
}
