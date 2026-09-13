import type { NutritionMetricKey } from "./nutritionMetrics";

/**
 * The Tailwind classes that apply each macro's semantic colour. Every component
 * that colours something by nutrient reads from this map rather than hard-coding
 * the classes, so a palette change happens in one place.
 */
export interface MetricColour {
  /** Full-strength text/icon colour. */
  text: string;
  darkText: string;
  /** Muted fill for bars and progress tracks. */
  muted: string;
  darkMuted: string;
  /** Muted colour as a text/currentColor utility, for SVG stroke tracks. */
  mutedText: string;
  darkMutedText: string;
  /** Very light tinted background for card surfaces. */
  bg: string;
  darkBg: string;
  /** Deep solid background for full-colored cards. */
  solidBg: string;
  darkSolidBg: string;
  /** CSS custom-property value for Recharts / inline styles (light). */
  hex: string;
  darkHex: string;
}

const METRIC_COLOURS: Record<NutritionMetricKey, MetricColour> = {
  calories: {
    text: "text-calories",
    darkText: "text-dark-calories",
    muted: "bg-calories-muted",
    darkMuted: "bg-dark-calories-muted",
    mutedText: "text-calories-muted",
    darkMutedText: "text-dark-calories-muted",
    bg: "bg-calories-bg",
    darkBg: "bg-dark-calories-bg",
    solidBg: "bg-calories",
    darkSolidBg: "bg-dark-calories",
    hex: "#0EA57A",
    darkHex: "#11B082",
  },
  protein: {
    text: "text-protein",
    darkText: "text-dark-protein",
    muted: "bg-protein-muted",
    darkMuted: "bg-dark-protein-muted",
    mutedText: "text-protein-muted",
    darkMutedText: "text-dark-protein-muted",
    bg: "bg-protein-bg",
    darkBg: "bg-dark-protein-bg",
    solidBg: "bg-protein",
    darkSolidBg: "bg-dark-protein",
    hex: "#E05555",
    darkHex: "#E05C5C",
  },
  carbs: {
    text: "text-carbs",
    darkText: "text-dark-carbs",
    muted: "bg-carbs-muted",
    darkMuted: "bg-dark-carbs-muted",
    mutedText: "text-carbs-muted",
    darkMutedText: "text-dark-carbs-muted",
    bg: "bg-carbs-bg",
    darkBg: "bg-dark-carbs-bg",
    solidBg: "bg-carbs",
    darkSolidBg: "bg-dark-carbs",
    hex: "#D4930D",
    darkHex: "#D69811",
  },
  fat: {
    text: "text-fat",
    darkText: "text-dark-fat",
    muted: "bg-fat-muted",
    darkMuted: "bg-dark-fat-muted",
    mutedText: "text-fat-muted",
    darkMutedText: "text-dark-fat-muted",
    bg: "bg-fat-bg",
    darkBg: "bg-dark-fat-bg",
    solidBg: "bg-fat",
    darkSolidBg: "bg-dark-fat",
    hex: "#8B6FC0",
    darkHex: "#8D6DD6",
  },
};

export function colourFor(key: NutritionMetricKey): MetricColour {
  return METRIC_COLOURS[key];
}
