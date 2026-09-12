export interface UnitDefinition {
  value: string;
  label: string;
  factorToBase?: number;
}

export const MASS_UNITS: UnitDefinition[] = [
  { value: "g", label: "g (Grams)", factorToBase: 1 },
  { value: "mg", label: "mg (Milligrams)", factorToBase: 0.001 },
  { value: "mcg", label: "mcg (Micrograms)", factorToBase: 0.000001 },
  { value: "kg", label: "kg (Kilograms)", factorToBase: 1000 },
  { value: "oz", label: "oz (Ounces)", factorToBase: 28.3495 },
  { value: "lb", label: "lb (Pounds)", factorToBase: 453.592 },
];

export const VOLUME_UNITS: UnitDefinition[] = [
  { value: "ml", label: "ml (Milliliters)", factorToBase: 1 },
  { value: "l", label: "l (Liters)", factorToBase: 1000 },
  { value: "cup", label: "cup", factorToBase: 236.588 },
  { value: "tbsp", label: "tbsp (Tablespoons)", factorToBase: 14.7868 },
  { value: "tsp", label: "tsp (Teaspoons)", factorToBase: 4.92892 },
  { value: "fl oz", label: "fl oz (Fluid Ounces)", factorToBase: 29.5735 },
];

export const OTHER_UNITS: UnitDefinition[] = [
  { value: "IU", label: "IU (International Units)" },
  { value: "serving", label: "serving" },
  { value: "piece", label: "piece" },
  { value: "slice", label: "slice" },
];

export const FOOD_UNIT_OPTIONS = [
  ...MASS_UNITS.map((u) => ({ value: u.value, label: u.label })),
  ...VOLUME_UNITS.map((u) => ({ value: u.value, label: u.label })),
  ...OTHER_UNITS.filter((u) => u.value !== "IU").map((u) => ({ value: u.value, label: u.label })),
];

export const MICRO_UNIT_OPTIONS = [
  { value: "g", label: "g (Grams)" },
  { value: "mg", label: "mg (Milligrams)" },
  { value: "mcg", label: "mcg (Micrograms)" },
  { value: "IU", label: "IU (International Units)" },
];
