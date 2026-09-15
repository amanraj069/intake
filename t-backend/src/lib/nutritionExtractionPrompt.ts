import { z } from 'zod';
import { CONFIDENCE_FACTOR_KEYS, ConfidenceFactorKey } from './extractionConfidence';
import { FOOD_ITEM_UNITS } from '../models/FoodEntry';
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

/** A photo rarely shows more separate foods than this; the service trims anything beyond it. */
export const MAX_PHOTO_ITEMS = 8;

const MICRONUTRIENT_LINES = MICRONUTRIENT_CATALOG.map(
  (nutrient) => `- ${nutrient.name} (usually in ${nutrient.labelUnit})`
).join('\n');

/**
 * Which micronutrients to report and how. Shared with the chat assistant, so a
 * meal logged there carries the same nutrients as one read from a photo.
 */
export const MICRONUTRIENT_RULES = `Report only the important, significant ones, at most ${MAX_REPORTED_MICRONUTRIENTS} per item, most significant first. Do not try to cover the whole list.
- For a label: the micronutrients it prints with an amount of 5 mg or more.
- For a meal: only nutrients the item is a notable source of (roughly 10% or more of the US FDA Daily Value), or that matter for the food, such as sodium in salty or processed dishes. Skip trace amounts and strictly exclude any micronutrient present in amounts less than 5 mg.
Leave out anything unknown instead of guessing or reporting zero. Give each amount in "mg" or "mcg". If a label shows only a % Daily Value, convert it using the US FDA Daily Values. Do not report any micronutrient whose final converted amount is less than 5 mg.
Use names from this list only, spelled exactly as written:
${MICRONUTRIENT_LINES}`;

/** How each confidence factor is scored. Shared with the chat assistant, so a photo logged there is scored the same way. */
export const CONFIDENCE_FACTOR_RUBRIC = `foodIdentity: do we know what each item is?
- 90-100: named product on packaging, or an unmistakable single food (a banana, a boiled egg).
- 70-89: a recognisable dish, where variants differ little (toast with jam, a margherita pizza).
- 40-69: the kind of dish is clear but the variant matters (a curry, a sandwich with unseen fillings), or a label with no product name where the food must be inferred from its numbers.
- 0-39: guessing between quite different foods.

portionSize: do we know how much of each item there is?
- 90-100: the weight is printed and applies to what is shown (one packaged item), or the user's description states the amount.
- 70-89: countable items of standard size (two slices of bread, one egg), or a label serving size where one serving is the obvious portion.
- 40-69: a plate or bowl estimated by eye, with some scale reference (cutlery, a standard plate).
- 0-39: no scale reference, food piled or partly out of frame, or a label where the amount actually eaten is unknown (a multi-serving container).

nutrientValues: given the items and amounts, how reliable are the calories and macros?
- 90-100: printed on a legible label.
- 70-89: a simple food with little hidden variation (fruit, plain rice, a boiled egg).
- 40-69: a prepared dish where cooking fat, sauces, fillings or recipe change the numbers noticeably.
- 0-39: mostly hidden ingredients (fried food, creamy sauces, dishes whose fat content cannot be seen).

imageQuality: could the photo be read properly?
- 90-100: sharp, well lit, the whole food or label in frame.
- 60-89: minor blur, glare, shadow or cropping that does not hide anything important.
- 0-59: blur, darkness, glare or cropping that hides part of the food or label.`;

export const EXTRACTION_SYSTEM_INSTRUCTION = `You are a nutrition analyst for a calorie-tracking app. You receive one photo, which is either food (a plated meal, a snack, a drink, a packaged item) or a printed nutrition facts label. The user will review and edit everything you return before it is saved, so be accurate and never invent precision you do not have.

Step 1: classify the photo as imageKind.
- "nutrition-label": a printed nutrition facts panel is legible. Read the values exactly as printed. Do not estimate values the label shows.
- "meal": food or drink is clearly visible. Identify it and estimate the portion shown.
- "unclear": food may be present, but the photo is too blurry, dark, cropped or obstructed to identify it or judge the portion.
- "not-food": the photo contains no food, drink or nutrition label.
For "unclear" and "not-food", set unreadableReason to one short sentence the user can act on (for example "The label is out of focus, so the numbers cannot be read.") and return no items.

Step 2: split what is shown into items.
- items: the separate components a person would log individually, largest share of calories first, at most ${MAX_PHOTO_ITEMS}. A plate of distinct foods (roti, dal, rice, salad) is one item per food. A dish eaten as one thing (a sandwich, a slice of pizza, cereal with milk, a mixed curry) is one item. A nutrition label is one item: the product.
- name: short and specific, in title case, singular for counted pieces, such as "Roti", "Paneer Butter Masala" or "Greek Yogurt, Plain". For a label, use the product name when it is visible; otherwise infer the most likely food from the numbers and packaging.
- unit: "count" for pieces that are naturally counted (roti, egg, slice of bread, banana, cookie, idli); "ml" for drinks and other liquids; "g" for everything else. A bowl, cup, plate or scoop is never a count: estimate its weight in grams.
- quantity: the total amount of that item shown, in its unit, such as 2 for two rotis or 180 for 180 g of rice. For a label, one serving as printed, in g or ml.
- mealName: what a person would call everything shown, short and in title case, such as "Roti Sabji", "Dal Chawal" or "Chicken Caesar Salad". For a single item or a label, the item's name.
- productNameVisible: true only when the photo shows the product's name or packaging that identifies it. Always false for a meal photo.

Step 3: nutrition for each item, for that item's quantity only (not per 100 g, and not the whole meal).
- calories in kcal, and proteinG, carbG and fatG in grams.
- Each item's calories should roughly equal 4 x protein + 4 x carbs + 9 x fat. Labels can differ slightly because of fibre and rounding: keep the printed values.
- For a meal, use standard food composition data (such as USDA FoodData Central or the Indian Food Composition Tables) and count visible oil, ghee, butter, dressing or sauce in the item it is on.

Step 4: micronutrients for each item. ${MICRONUTRIENT_RULES}

Step 5: confidenceFactors. Score each factor from 0 to 100 on how sure you are, with one short, specific reason. Judge each factor on its own: a clear photo does not make an unknown portion certain. Use these anchors and interpolate between them.

${CONFIDENCE_FACTOR_RUBRIC}

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
Use this to identify the items and the amount of each eaten. If a nutrition label is visible, the printed values take priority over the description.
Set descriptionStatesAmount to true only if the description gives a quantity or weight, such as "2 rotis", "one bowl" or "150 g". A description that only names the food is false.`;
}

const MAX_READING_TEXT = 300;
const MAX_MODEL_NUMBER = 100000;

const modelNumber = z.number().finite().nonnegative().max(MAX_MODEL_NUMBER);

/**
 * Free text the user only reads (a note, a reason). An over-long sentence is
 * trimmed rather than rejected: failing the whole photo over a wordy note would
 * throw away numbers that were read correctly.
 */
const readerText = (maxLength: number) =>
  z
    .string()
    .trim()
    .transform((text) => (text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text));

const factorReadingSchema = z.object({
  score: z.number().finite().min(0).max(100),
  reason: readerText(MAX_READING_TEXT).refine((reason) => reason.length > 0),
});

export const confidenceFactorsSchema = z.object(
  Object.fromEntries(CONFIDENCE_FACTOR_KEYS.map((key) => [key, factorReadingSchema])) as Record<
    ConfidenceFactorKey,
    typeof factorReadingSchema
  >
);

export const aiMicronutrientSchema = z.object({
  name: z.string().trim(),
  amount: modelNumber,
  unit: z.enum(['mg', 'mcg']),
});

/** One component of the photo as the model read it. */
const aiFoodItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: modelNumber,
  unit: z.enum(FOOD_ITEM_UNITS),
  calories: modelNumber,
  proteinG: modelNumber,
  carbG: modelNumber,
  fatG: modelNumber,
  micronutrients: z.array(aiMicronutrientSchema).max(MICRONUTRIENT_NAMES.length * 2).default([]),
});

/**
 * The model's raw answer. A response schema constrains generation, but the
 * output is still untrusted: every field is checked here, and the service
 * decides what a complete, usable reading is.
 */
export const aiFoodReadingSchema = z.object({
  imageKind: z.enum(IMAGE_KINDS),
  unreadableReason: readerText(MAX_READING_TEXT).optional(),
  mealName: readerText(200).optional(),
  /** Empty for "unclear" and "not-food", which carry no nutrition. */
  items: z.array(aiFoodItemSchema).default([]),
  productNameVisible: z.boolean().default(false),
  descriptionStatesAmount: z.boolean().default(false),
  /** Absent for "unclear" and "not-food", which carry no nutrition to be confident about. */
  confidenceFactors: confidenceFactorsSchema.optional(),
  notes: readerText(MAX_READING_TEXT).optional(),
});

export type AiFoodReading = z.infer<typeof aiFoodReadingSchema>;
export type AiFoodItem = z.infer<typeof aiFoodItemSchema>;
