/**
 * Turns the model's per-factor scores into one confidence percentage, then
 * sets the level with the rule ladder in `confidenceLevel.ts`.
 *
 * Asking a model "how confident are you?" returns a number it has no good basis
 * for. Instead it scores four narrow questions against a written rubric, and the
 * arithmetic that combines them lives here, where it is visible, testable and
 * the same for every photo.
 */

import { ConfidenceLevel, decideConfidenceLevel } from './confidenceLevel';

export const CONFIDENCE_FACTOR_KEYS = [
  'foodIdentity',
  'portionSize',
  'nutrientValues',
  'imageQuality',
] as const;

export type ConfidenceFactorKey = (typeof CONFIDENCE_FACTOR_KEYS)[number];

export interface FactorReading {
  score: number;
  reason: string;
}

export type FactorReadings = Record<ConfidenceFactorKey, FactorReading>;

export type ScoredImageKind = 'nutrition-label' | 'meal';

export interface ConfidenceFactor extends FactorReading {
  key: ConfidenceFactorKey;
  label: string;
  /** Share of the overall score this factor carries for this kind of photo, 0 to 1. */
  weight: number;
}

export interface ConfidenceAssessment {
  /** 0 to 95. */
  score: number;
  level: ConfidenceLevel;
  /** How the level was reached, one rule per line. */
  levelSteps: string[];
  factors: ConfidenceFactor[];
  /** Deterministic corrections applied to the percentage, in plain language. */
  adjustments: string[];
}

const FACTOR_LABELS: Record<ConfidenceFactorKey, string> = {
  foodIdentity: 'Food identity',
  portionSize: 'Portion size',
  nutrientValues: 'Nutrient values',
  imageQuality: 'Image quality',
};

/**
 * On a label the printed numbers carry most of the answer; on a plate, how much
 * food there is and what is hidden in it matter as much as naming the dish.
 */
const FACTOR_WEIGHTS: Record<ScoredImageKind, Record<ConfidenceFactorKey, number>> = {
  'nutrition-label': { foodIdentity: 0.2, portionSize: 0.25, nutrientValues: 0.45, imageQuality: 0.1 },
  meal: { foodIdentity: 0.25, portionSize: 0.35, nutrientValues: 0.3, imageQuality: 0.1 },
};

/**
 * How much the weakest factor pulls the result down. A pure weighted mean lets a
 * sharp photo and a recognisable dish hide a portion nobody can judge; blending
 * in the minimum means one unknown always shows.
 */
const WEAKEST_FACTOR_SHARE = 0.25;

/** A reading from a single photo is never certain, whatever the factors say. */
export const MAX_CONFIDENCE = 95;

/** Without a product name, what the food is has to be inferred from its numbers. */
const UNNAMED_LABEL_IDENTITY_CAP = 50;

/** A label says what one serving is, not how much of the pack was eaten. */
const UNDESCRIBED_LABEL_PORTION_CAP = 80;

const ENERGY_MISMATCH_PENALTY = 15;

export interface ConfidenceContext {
  imageKind: ScoredImageKind;
  productNameVisible: boolean;
  /** The user typed a description, which may state how much they ate. */
  hasUserDescription: boolean;
  /** The model found an amount in that description, such as "2 slices". */
  descriptionStatesAmount: boolean;
  /** Calories disagree with 4/4/9 macro energy beyond the warning threshold. */
  energyMismatch: boolean;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

interface FactorCap {
  key: ConfidenceFactorKey;
  max: number;
  applies: (context: ConfidenceContext) => boolean;
  reason: string;
}

/** Limits the model cannot talk its way past, whatever it scored. */
const FACTOR_CAPS: readonly FactorCap[] = [
  {
    key: 'foodIdentity',
    max: UNNAMED_LABEL_IDENTITY_CAP,
    applies: (context) => context.imageKind === 'nutrition-label' && !context.productNameVisible,
    reason: 'no product name is visible on the label',
  },
  {
    key: 'portionSize',
    max: UNDESCRIBED_LABEL_PORTION_CAP,
    applies: (context) => context.imageKind === 'nutrition-label' && !context.hasUserDescription,
    reason: 'a label gives one serving, not how much was eaten',
  },
];

function capFactors(readings: FactorReadings, context: ConfidenceContext) {
  const adjustments: string[] = [];
  const capped: FactorReadings = { ...readings };

  for (const cap of FACTOR_CAPS) {
    if (!cap.applies(context) || clampScore(readings[cap.key].score) <= cap.max) continue;

    capped[cap.key] = { ...readings[cap.key], score: cap.max };
    adjustments.push(`${FACTOR_LABELS[cap.key]} capped at ${cap.max}: ${cap.reason}.`);
  }

  return { capped, adjustments };
}

export function assessConfidence(
  readings: FactorReadings,
  context: ConfidenceContext
): ConfidenceAssessment {
  const { capped, adjustments } = capFactors(readings, context);
  const weights = FACTOR_WEIGHTS[context.imageKind];

  const factors: ConfidenceFactor[] = CONFIDENCE_FACTOR_KEYS.map((key) => ({
    key,
    label: FACTOR_LABELS[key],
    weight: weights[key],
    score: clampScore(capped[key].score),
    reason: capped[key].reason,
  }));

  const weightedMean = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
  const weakest = Math.min(...factors.map((factor) => factor.score));
  let score = weightedMean * (1 - WEAKEST_FACTOR_SHARE) + weakest * WEAKEST_FACTOR_SHARE;

  if (context.energyMismatch) {
    score -= ENERGY_MISMATCH_PENALTY;
    adjustments.push(`-${ENERGY_MISMATCH_PENALTY}: calories and macros do not agree.`);
  }

  if (score > MAX_CONFIDENCE) {
    adjustments.push(`Capped at ${MAX_CONFIDENCE}%: a reading from one photo is never certain.`);
  }

  const finalScore = Math.min(MAX_CONFIDENCE, clampScore(score));
  const scoreOf = (key: ConfidenceFactorKey) => factors.find((factor) => factor.key === key)?.score ?? 0;

  const { level, steps } = decideConfidenceLevel({
    imageKind: context.imageKind,
    descriptionStatesAmount: context.hasUserDescription && context.descriptionStatesAmount,
    energyMismatch: context.energyMismatch,
    foodIdentityScore: scoreOf('foodIdentity'),
    portionSizeScore: scoreOf('portionSize'),
    overallScore: finalScore,
  });

  return { score: finalScore, level, levelSteps: steps, factors, adjustments };
}
