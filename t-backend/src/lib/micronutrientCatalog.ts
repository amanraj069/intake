/**
 * The micronutrients the app offers by name. Names must match
 * `t-frontend/src/lib/micronutrients.ts` exactly, so an extracted nutrient lands
 * on a known option in the meal form instead of a free-text custom row.
 *
 * `labelUnit` is the unit nutrition labels and food composition tables usually
 * print, which is what a model reads most accurately. Amounts are converted to
 * milligrams before they leave the server, because the app stores every
 * micronutrient in mg.
 */
export type LabelUnit = 'mg' | 'mcg';

export interface CatalogMicronutrient {
  name: string;
  labelUnit: LabelUnit;
}

export const MICRONUTRIENT_CATALOG: readonly CatalogMicronutrient[] = [
  { name: 'Vitamin A', labelUnit: 'mcg' },
  { name: 'Vitamin B1 (Thiamine)', labelUnit: 'mg' },
  { name: 'Vitamin B2 (Riboflavin)', labelUnit: 'mg' },
  { name: 'Vitamin B3 (Niacin)', labelUnit: 'mg' },
  { name: 'Vitamin B5 (Pantothenic Acid)', labelUnit: 'mg' },
  { name: 'Vitamin B6', labelUnit: 'mg' },
  { name: 'Vitamin B7 (Biotin)', labelUnit: 'mcg' },
  { name: 'Vitamin B9 (Folate)', labelUnit: 'mcg' },
  { name: 'Vitamin B12', labelUnit: 'mcg' },
  { name: 'Vitamin C', labelUnit: 'mg' },
  { name: 'Vitamin D', labelUnit: 'mcg' },
  { name: 'Vitamin E', labelUnit: 'mg' },
  { name: 'Vitamin K', labelUnit: 'mcg' },
  { name: 'Calcium', labelUnit: 'mg' },
  { name: 'Chromium', labelUnit: 'mcg' },
  { name: 'Copper', labelUnit: 'mg' },
  { name: 'Iodine', labelUnit: 'mcg' },
  { name: 'Iron', labelUnit: 'mg' },
  { name: 'Magnesium', labelUnit: 'mg' },
  { name: 'Manganese', labelUnit: 'mg' },
  { name: 'Molybdenum', labelUnit: 'mcg' },
  { name: 'Phosphorus', labelUnit: 'mg' },
  { name: 'Potassium', labelUnit: 'mg' },
  { name: 'Selenium', labelUnit: 'mcg' },
  { name: 'Sodium', labelUnit: 'mg' },
  { name: 'Zinc', labelUnit: 'mg' },
  { name: 'Choline', labelUnit: 'mg' },
  { name: 'Omega-3', labelUnit: 'mg' },
  { name: 'CoQ10', labelUnit: 'mg' },
];

export const MICRONUTRIENT_NAMES: readonly string[] = MICRONUTRIENT_CATALOG.map(
  (nutrient) => nutrient.name
);

const MILLIGRAMS_PER_UNIT: Record<LabelUnit, number> = { mg: 1, mcg: 0.001 };

export function toMilligrams(amount: number, unit: LabelUnit): number {
  return amount * MILLIGRAMS_PER_UNIT[unit];
}
