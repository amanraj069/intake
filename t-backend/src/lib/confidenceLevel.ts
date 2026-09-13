/**
 * The confidence level (high, medium or low) as a ladder of named rules. Each
 * rule that fires moves the level one step and records why, so the user can
 * read exactly how "Medium" was reached instead of trusting a label.
 *
 * The percentage from `extractionConfidence.ts` answers "how sure, overall";
 * this ladder answers "what should I double-check", and the final rule keeps
 * the two from contradicting each other.
 */

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Below this factor score, the model is treated as unsure about that question. */
export const UNSURE_FACTOR_THRESHOLD = 60;

/** The percentage bands a level may not rise above. */
const SCORE_CEILINGS: readonly { below: number; maxLevel: ConfidenceLevel }[] = [
  { below: 40, maxLevel: 'low' },
  { below: 60, maxLevel: 'medium' },
];

export interface LevelInputs {
  imageKind: 'nutrition-label' | 'meal';
  /** The user typed a description, and the model found an amount in it. */
  descriptionStatesAmount: boolean;
  energyMismatch: boolean;
  foodIdentityScore: number;
  portionSizeScore: number;
  /** The overall percentage, after caps and penalties. */
  overallScore: number;
}

export interface LevelResult {
  level: ConfidenceLevel;
  /** Every rule that set or moved the level, in the order applied. */
  steps: string[];
}

const LEVEL_NAMES: Record<ConfidenceLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function shift(level: ConfidenceLevel, by: 1 | -1): ConfidenceLevel {
  const index = CONFIDENCE_LEVELS.indexOf(level) + by;
  return CONFIDENCE_LEVELS[Math.min(CONFIDENCE_LEVELS.length - 1, Math.max(0, index))];
}

interface LevelRule {
  applies: (inputs: LevelInputs) => boolean;
  direction: 1 | -1;
  because: (inputs: LevelInputs) => string;
}

/** Applied top to bottom after the starting level. The upgrade runs first so a downgrade always has the last word. */
const LEVEL_RULES: readonly LevelRule[] = [
  {
    applies: (inputs) => inputs.imageKind === 'meal' && inputs.descriptionStatesAmount,
    direction: 1,
    because: () => 'your description states how much was eaten',
  },
  {
    applies: (inputs) => inputs.energyMismatch,
    direction: -1,
    because: () => 'calories and macros do not agree',
  },
  {
    applies: (inputs) => inputs.foodIdentityScore < UNSURE_FACTOR_THRESHOLD,
    direction: -1,
    because: (inputs) =>
      `unsure what the food is (food identity ${inputs.foodIdentityScore}, below ${UNSURE_FACTOR_THRESHOLD})`,
  },
  {
    applies: (inputs) => inputs.portionSizeScore < UNSURE_FACTOR_THRESHOLD,
    direction: -1,
    because: (inputs) =>
      `unsure how much there is (portion size ${inputs.portionSizeScore}, below ${UNSURE_FACTOR_THRESHOLD})`,
  },
];

function startingLevel(inputs: LevelInputs): LevelResult {
  return inputs.imageKind === 'nutrition-label'
    ? { level: 'high', steps: ['Start at High: nutrition label with printed values'] }
    : { level: 'medium', steps: ['Start at Medium: meal photo with an estimated portion'] };
}

function applyScoreCeiling(result: LevelResult, overallScore: number): LevelResult {
  const ceiling = SCORE_CEILINGS.find((band) => overallScore < band.below);
  if (!ceiling) return result;

  const allowed = CONFIDENCE_LEVELS.indexOf(ceiling.maxLevel);
  if (CONFIDENCE_LEVELS.indexOf(result.level) <= allowed) return result;

  return {
    level: ceiling.maxLevel,
    steps: [
      ...result.steps,
      `Held at ${LEVEL_NAMES[ceiling.maxLevel]}: the overall score of ${overallScore}% is below ${ceiling.below}%`,
    ],
  };
}

export function decideConfidenceLevel(inputs: LevelInputs): LevelResult {
  let result = startingLevel(inputs);

  for (const rule of LEVEL_RULES) {
    if (!rule.applies(inputs)) continue;

    const next = shift(result.level, rule.direction);
    const verb = rule.direction === 1 ? 'Up' : 'Down';
    const outcome = next === result.level ? `Stays ${LEVEL_NAMES[next]}` : `${verb} to ${LEVEL_NAMES[next]}`;
    result = { level: next, steps: [...result.steps, `${outcome}: ${rule.because(inputs)}`] };
  }

  return applyScoreCeiling(result, inputs.overallScore);
}
