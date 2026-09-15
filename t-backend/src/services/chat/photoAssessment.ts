import { z } from 'zod';

import { ExtractionAnalysis, buildExtractionAnalysis } from '../../lib/extractionAnalysis';
import { CONFIDENCE_FACTOR_KEYS } from '../../lib/extractionConfidence';
import { confidenceFactorsSchema } from '../../lib/nutritionExtractionPrompt';
import { FoodItemInput } from '../../schemas/foodEntry.schema';
import { AttachedPhoto, ToolOutcome, describeValidationError } from './chatToolTypes';

/**
 * When the assistant logs a meal from a photo, it reports the same photo
 * reading that photo extraction does: what kind of photo it is and a score per
 * confidence factor. The percentage and level are then worked out by the same
 * deterministic code, so a meal logged in chat carries the same breakdown as
 * one logged from the Log Meal page.
 */

/** Only a photo the model could read is logged; an unreadable one is answered by asking the user instead. */
const SCORED_IMAGE_KINDS = ['meal', 'nutrition-label'] as const;
const MAX_NOTE_LENGTH = 300;

const FACTOR_PARAMETER = {
  type: 'OBJECT',
  properties: {
    reason: { type: 'STRING', description: 'One short, specific reason' },
    score: { type: 'INTEGER', description: '0 to 100' },
  },
  required: ['reason', 'score'],
};

export const PHOTO_ASSESSMENT_PARAMETER = {
  type: 'OBJECT',
  description:
    "Required when the user's latest message has a photo attached and the food is from that photo; omit it otherwise.",
  properties: {
    imageKind: { type: 'STRING', enum: [...SCORED_IMAGE_KINDS] },
    productNameVisible: { type: 'BOOLEAN', description: 'true only when the photo shows the product name or its packaging' },
    descriptionStatesAmount: {
      type: 'BOOLEAN',
      description: "true only when the user's message gives a quantity or weight, such as \"2 rotis\" or \"150 g\"",
    },
    confidenceFactors: {
      type: 'OBJECT',
      properties: Object.fromEntries(CONFIDENCE_FACTOR_KEYS.map((key) => [key, FACTOR_PARAMETER])),
      required: [...CONFIDENCE_FACTOR_KEYS],
    },
    notes: { type: 'STRING', description: 'One short sentence with the main assumption made' },
  },
  required: ['imageKind', 'productNameVisible', 'descriptionStatesAmount', 'confidenceFactors'],
};

const photoAssessmentArgsSchema = z.object({
  photoAssessment: z.object(
    {
      imageKind: z.enum(SCORED_IMAGE_KINDS),
      productNameVisible: z.boolean().default(false),
      descriptionStatesAmount: z.boolean().default(false),
      confidenceFactors: confidenceFactorsSchema,
      // A wordy note is trimmed, not rejected: it is only ever read, and refusing the meal over it would waste a model call.
      notes: z
        .string()
        .trim()
        .transform((note) => note.slice(0, MAX_NOTE_LENGTH))
        .optional(),
    },
    { required_error: 'required, because the user attached a photo to this message' }
  ),
});

/** Scores the model's reading of the attached photo against the items it is about to log. */
export function assessLoggedPhoto(
  items: readonly FoodItemInput[],
  rawAssessment: unknown,
  photo: AttachedPhoto
): ToolOutcome<ExtractionAnalysis> {
  const parsed = photoAssessmentArgsSchema.safeParse({ photoAssessment: rawAssessment });
  if (!parsed.success) return { ok: false, error: describeValidationError(parsed.error) };

  return {
    ok: true,
    value: buildExtractionAnalysis(items, { ...parsed.data.photoAssessment, hasUserDescription: photo.hasCaption }),
  };
}
