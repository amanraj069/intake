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
    bg: "bg-calories-bg",
    darkBg: "bg-dark-calories-bg",
    solidBg: "bg-calories",
    darkSolidBg: "bg-dark-calories",
    hex: "#0EA57A",
    darkHex: "#34D399",
  },
  protein: {
    text: "text-protein",
    darkText: "text-dark-protein",
    muted: "bg-protein-muted",
    darkMuted: "bg-dark-protein-muted",
    bg: "bg-protein-bg",
    darkBg: "bg-dark-protein-bg",
    solidBg: "bg-protein",
    darkSolidBg: "bg-dark-protein",
    hex: "#E05555",
    darkHex: "#FF8787",
  },
  carbs: {
    text: "text-carbs",
    darkText: "text-dark-carbs",
    muted: "bg-carbs-muted",
    darkMuted: "bg-dark-carbs-muted",
    bg: "bg-carbs-bg",
    darkBg: "bg-dark-carbs-bg",
    solidBg: "bg-carbs",
    darkSolidBg: "bg-dark-carbs",
    hex: "#D4930D",
    darkHex: "#FFC97A",
  },
  fat: {
    text: "text-fat",
    darkText: "text-dark-fat",
    muted: "bg-fat-muted",
    darkMuted: "bg-dark-fat-muted",
    bg: "bg-fat-bg",
    darkBg: "bg-dark-fat-bg",
    solidBg: "bg-fat",
    darkSolidBg: "bg-dark-fat",
    hex: "#8B6FC0",
    darkHex: "#B4A0FF",
  },
};

export function colourFor(key: NutritionMetricKey): MetricColour {
  return METRIC_COLOURS[key];
}
