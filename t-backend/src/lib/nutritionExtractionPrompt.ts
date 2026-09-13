import { z } from 'zod';
import { CONFIDENCE_FACTOR_KEYS, ConfidenceFactorKey } from './extractionConfidence';
import { MICRONUTRIENT_CATALOG, MICRONUTRIENT_NAMES } from './micronutrientCatalog';

/**
 * What the model decided the photo shows. It classifies first so that a photo
 * of a desk or a blurry plate is reported as such, instead of being answered
 * with invented numbers.
 */
export const IMAGE_KINDS = ['nutrition-label', 'meal', 'unclear', 'not-food'] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

/**
 * Most foods contain trace amounts of dozens of micronutrients. Only the few
 * that matter for the portion are worth the user's review time.
 */
export const MAX_REPORTED_MICRONUTRIENTS = 6;

const MICRONUTRIENT_LINES = MICRONUTRIENT_CATALOG.map(
  (nutrient) => `- ${nutrient.name} (usually in ${nutrient.labelUnit})`
).join('\n');

export const EXTRACTION_SYSTEM_INSTRUCTION = `You are a nutrition analyst for a calorie-tracking app. You receive one photo, which is either food (a plated meal, a snack, a drink, a packaged item) or a printed nutrition facts label. The user will review and edit everything you return before it is saved, so be accurate and never invent precision you do not have.

Step 1: classify the photo as imageKind.
- "nutrition-label": a printed nutrition facts panel is legible. Read the values exactly as printed. Do not estimate values the label shows.
- "meal": food or drink is clearly visible. Identify it and estimate the portion shown.
- "unclear": food may be present, but the photo is too blurry, dark, cropped or obstructed to identify it or judge the portion.
- "not-food": the photo contains no food, drink or nutrition label.
For "unclear" and "not-food", set unreadableReason to one short sentence the user can act on (for example "The label is out of focus, so the numbers cannot be read.") and omit every nutrition field.

Step 2: describe the portion.
- foodName: a short, specific name in title case, such as "Chicken Caesar Salad" or "Greek Yogurt, Plain". For a label, use the product name when it is visible; otherwise infer the most likely food from the numbers and packaging.
- productNameVisible: true only when the photo shows the product's name or packaging that identifies it. Always false for a meal photo.
- quantity: how many servings are shown. For a single plate or item, use 1. For a label, use 1 serving as printed.
- servingWeightG: the weight of one serving in grams. For drinks, treat 1 ml as 1 g unless the label says otherwise.

Step 3: nutrition totals for the whole portion (quantity servings, not per 100 g).
- calories in kcal, and proteinG, carbG and fatG in grams.
- Calories should roughly equal 4 x protein + 4 x carbs + 9 x fat. Labels can differ slightly because of fibre and rounding: keep the printed values.
- For a meal, use standard food composition data (such as USDA FoodData Central) and account for visible oils, dressings, sauces and toppings.

Step 4: micronutrients. Report only the important, significant ones, at most ${MAX_REPORTED_MICRONUTRIENTS}, most significant first. Do not try to cover the whole list.
- For a label: the micronutrients it prints with an amount of 5 mg or more.
- For a meal: only nutrients the portion is a notable source of (roughly 10% or more of the US FDA Daily Value), or that matter for the food, such as sodium in salty or processed dishes. Skip trace amounts and strictly exclude any micronutrient present in amounts less than 5 mg.
Leave out anything unknown instead of guessing or reporting zero. Give each amount in "mg" or "mcg". If a label shows only a % Daily Value, convert it using the US FDA Daily Values. Do not report any micronutrient whose final converted amount is less than 5 mg.
Use names from this list only, spelled exactly as written:
${MICRONUTRIENT_LINES}

Step 5: confidenceFactors. Score each factor from 0 to 100 on how sure you are, with one short, specific reason. Judge each factor on its own: a clear photo does not make an unknown portion certain. Use these anchors and interpolate between them.

foodIdentity: do we know what the food is?
- 90-100: named product on packaging, or an unmistakable single food (a banana, a boiled egg).
- 70-89: a recognisable dish, where variants differ little (toast with jam, a margherita pizza).
- 40-69: the kind of dish is clear but the variant matters (a curry, a sandwich with unseen fillings), or a label with no product name where the food must be inferred from its numbers.
- 0-39: guessing between quite different foods.

portionSize: do we know how much food there is?
- 90-100: the weight is printed and applies to what is shown (one packaged item), or the user's description states the amount.
- 70-89: countable items of standard size (two slices of bread, one egg), or a label serving size where one serving is the obvious portion.
- 40-69: a plate or bowl estimated by eye, with some scale reference (cutlery, a standard plate).
- 0-39: no scale reference, food piled or partly out of frame, or a label where the amount actually eaten is unknown (a multi-serving container).

nutrientValues: given the food and amount, how reliable are the calories and macros?
- 90-100: printed on a legible label.
- 70-89: a simple food with little hidden variation (fruit, plain rice, a boiled egg).
- 40-69: a prepared dish where cooking fat, sauces, fillings or recipe change the numbers noticeably.
- 0-39: mostly hidden ingredients (fried food, creamy sauces, dishes whose fat content cannot be seen).

imageQuality: could the photo be read properly?
- 90-100: sharp, well lit, the whole food or label in frame.
- 60-89: minor blur, glare, shadow or cropping that does not hide anything important.
- 0-59: blur, darkness, glare or cropping that hides part of the food or label.

Finally:
- notes: one short sentence telling the user the main assumption you made, such as "Assumed about one tablespoon of olive oil in the dressing."

Reply only with JSON that matches the response schema.`;

/**
 * Builds the text that accompanies the photo. The user's description is a hint
 * about their own meal, quoted so it reads as data rather than as instructions.
 */
export function buildExtractionPrompt(description?: string): string {
  const base = 'Analyse this photo and return the nutrition for the portion shown.';
  if (!description) return base;

  return `${base}
The user describes it as: "${description.replace(/"/g, "'")}".
Use this to identify the food and the amount eaten. If a nutrition label is visible, the printed values take priority over the description.
Set descriptionStatesAmount to true only if the description gives a quantity or weight, such as "2 slices", "one bowl" or "150 g". A description that only names the food is false.`;
}

const MAX_READING_TEXT = 300;
const MAX_MODEL_NUMBER = 100000;

const modelNumber = z.number().finite().nonnegative().max(MAX_MODEL_NUMBER);

const factorReadingSchema = z.object({
  score: z.number().finite().min(0).max(100),
  reason: z.string().trim().min(1).max(MAX_READING_TEXT),
});

const confidenceFactorsSchema = z.object(
  Object.fromEntries(CONFIDENCE_FACTOR_KEYS.map((key) => [key, factorReadingSchema])) as Record<
    ConfidenceFactorKey,
    typeof factorReadingSchema
  >
);

const aiMicronutrientSchema = z.object({
  name: z.string().trim(),
  amount: modelNumber,
  unit: z.enum(['mg', 'mcg']),
});

/**
 * The model's raw answer. A response schema constrains generation, but the
 * output is still untrusted: every field is checked here, and the service
 * decides what a complete, usable reading is.
 */
export const aiFoodReadingSchema = z.object({
  imageKind: z.enum(IMAGE_KINDS),
  unreadableReason: z.string().trim().max(MAX_READING_TEXT).optional(),
  foodName: z.string().trim().max(200).optional(),
  quantity: modelNumber.optional(),
  servingWeightG: modelNumber.optional(),
  calories: modelNumber.optional(),
  proteinG: modelNumber.optional(),
  carbG: modelNumber.optional(),
  fatG: modelNumber.optional(),
  micronutrients: z.array(aiMicronutrientSchema).max(MICRONUTRIENT_NAMES.length * 2).default([]),
  productNameVisible: z.boolean().default(false),
  descriptionStatesAmount: z.boolean().default(false),
  /** Absent for "unclear" and "not-food", which carry no nutrition to be confident about. */
  confidenceFactors: confidenceFactorsSchema.optional(),
  notes: z.string().trim().max(MAX_READING_TEXT).optional(),
});

export type AiFoodReading = z.infer<typeof aiFoodReadingSchema>;
export type AiMicronutrient = z.infer<typeof aiMicronutrientSchema>;
