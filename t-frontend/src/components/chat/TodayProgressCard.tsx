"use client";

import { useMemo } from "react";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import type { ChatThreadMessage } from "@/types/chat";
import DailyOverviewProgress, { type NutritionProgressSummary } from "./DailyOverviewProgress";

interface TodayProgressCardProps {
  content: string;
}

const DEFAULT_CONCLUSION =
  "You have plenty of calories and macros remaining for the day. Let me know if you would like to log anything else or want ideas to hit your targets.";

function parseNum(str: string | undefined | null): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

/**
 * Extracts the snapshot of nutrition progress and targets recorded in the assistant's
 * response text at the moment it was sent. This preserves historical values in chat
 * so older progress checks don't mutate when new meals are logged later.
 */
export function extractTodayProgressSnapshot(content: string): NutritionProgressSummary | null {
  let calories: number | null = null;
  let calorieTarget: number | null = null;
  let protein: number | null = null;
  let proteinTarget: number | null = null;
  let carbs: number | null = null;
  let carbTarget: number | null = null;
  let fat: number | null = null;
  let fatTarget: number | null = null;

  // 1. Calories & Calorie Target
  // e.g. "consumed 1,429 kcal out of your 2,750 kcal daily goal" or "consumed 0 kcal out of 2220 kcal"
  const consumedMatch = content.match(
    /consumed\s+([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)?\s*(?:out\s+of|of|\/)\s*(?:your\s+)?([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)?/i
  );
  if (consumedMatch) {
    calories = parseNum(consumedMatch[1]);
    calorieTarget = parseNum(consumedMatch[2]);
  }

  // e.g. "- Calories: 1,199 of 2,750 kcal" or "Calories: 0 of 2,220 kcal (2,220 kcal left)"
  if (calories === null) {
    const calListMatch = content.match(
      /calories:\s*([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)?\s*(?:of|\/)\s*([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)?/i
    );
    if (calListMatch) {
      calories = parseNum(calListMatch[1]);
      calorieTarget = parseNum(calListMatch[2]);
    }
  }

  // e.g. "haven't logged any meals yet today" or "0 calories consumed"
  if (calories === null) {
    if (/haven't logged any meals|no meals logged yet|not logged any meals|0\s*calories\s+consumed/i.test(content)) {
      calories = 0;
    } else {
      const bareZeroMatch = content.match(/(?:consumed|intake is|at)\s+0\s*(?:kcal|calories)/i);
      if (bareZeroMatch) {
        calories = 0;
      }
    }
  }

  // Calorie target fallback if calories were found but target was mentioned elsewhere in text
  if (calorieTarget === null) {
    const targetMatch = content.match(
      /(?:daily\s+)?(?:calorie\s+)?(?:goal|target)(?:\s+is)?(?:\s+of)?\s*[:]?\s*([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)/i
    );
    if (targetMatch) {
      calorieTarget = parseNum(targetMatch[1]);
    }
  }

  // 2. Protein
  const pMatch = content.match(/protein:\s*([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|\/)\s*([\d,]+(?:\.\d+)?)\s*g?/i);
  if (pMatch) {
    protein = parseNum(pMatch[1]);
    proteinTarget = parseNum(pMatch[2]);
  } else {
    const pMatch2 = content.match(/([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|out of|\/)\s*([\d,]+(?:\.\d+)?)\s*g\s+protein/i);
    if (pMatch2) {
      protein = parseNum(pMatch2[1]);
      proteinTarget = parseNum(pMatch2[2]);
    }
  }

  // 3. Carbs
  const cMatch = content.match(/carb(?:s|ohydrates)?:\s*([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|\/)\s*([\d,]+(?:\.\d+)?)\s*g?/i);
  if (cMatch) {
    carbs = parseNum(cMatch[1]);
    carbTarget = parseNum(cMatch[2]);
  } else {
    const cMatch2 = content.match(/([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|out of|\/)\s*([\d,]+(?:\.\d+)?)\s*g\s+carb/i);
    if (cMatch2) {
      carbs = parseNum(cMatch2[1]);
      carbTarget = parseNum(cMatch2[2]);
    }
  }

  // 4. Fat
  const fMatch = content.match(/fat:\s*([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|\/)\s*([\d,]+(?:\.\d+)?)\s*g?/i);
  if (fMatch) {
    fat = parseNum(fMatch[1]);
    fatTarget = parseNum(fMatch[2]);
  } else {
    const fMatch2 = content.match(/([\d,]+(?:\.\d+)?)\s*g?\s*(?:of|out of|\/)\s*([\d,]+(?:\.\d+)?)\s*g\s+fat/i);
    if (fMatch2) {
      fat = parseNum(fMatch2[1]);
      fatTarget = parseNum(fMatch2[2]);
    }
  }

  // If no numbers at all could be found, return null so we can fall back to live summary
  if (calories === null && protein === null && carbs === null && fat === null) {
    return null;
  }

  return {
    totals: {
      calories: calories ?? 0,
      proteinG: protein ?? 0,
      carbG: carbs ?? 0,
      fatG: fat ?? 0,
    },
    goal: {
      dailyCalorieTarget: calorieTarget,
      proteinTargetG: proteinTarget,
      carbTargetG: carbTarget,
      fatTargetG: fatTarget,
    },
  };
}

export function extractTodayProgressConclusion(content: string): string {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const conclusionParagraphs = paragraphs.filter((p) => {
    const lower = p.toLowerCase();
    // Drop intro headers like "here is how you are doing today..."
    if (lower.startsWith("here is") || lower.startsWith("here's")) {
      return false;
    }
    // Drop "Today you have consumed..." or "You have consumed..." or "Your macro progress:"
    if (
      lower.includes("you have consumed") ||
      lower.startsWith("today you have") ||
      lower.includes("macro progress:") ||
      lower.includes("daily calorie goal")
    ) {
      return false;
    }
    // Drop raw bullet lists of numbers: "- Calories: ...", "- Protein: ..."
    if (p.includes("- Calories") || p.includes("- Protein") || (p.startsWith("-") && p.includes(":"))) {
      return false;
    }
    return true;
  });

  return conclusionParagraphs.length > 0 ? conclusionParagraphs.join("\n\n") : DEFAULT_CONCLUSION;
}

export function isTodayProgressMessage(message: ChatThreadMessage, prevMessage?: ChatThreadMessage): boolean {
  if (message.role !== "assistant") return false;
  if (message.action) return false;

  const userText = prevMessage?.role === "user" ? prevMessage.content.toLowerCase().trim() : "";
  const assistantText = message.content.toLowerCase();

  // Exclude weekly summaries or multi-day reviews (e.g. "Over the last 7 days...")
  if (
    assistantText.includes("last 7 days") ||
    assistantText.includes("weekly summary") ||
    userText.includes("last 7 days") ||
    userText.includes("weekly")
  ) {
    return false;
  }

  // 1. Check if user asked about goals, progress, or daily intake
  const mentionsToday =
    userText.includes("today") ||
    userText.includes("so far") ||
    userText.includes("day");

  const mentionsGoalOrProgress =
    userText.includes("goal") ||
    userText.includes("target") ||
    userText.includes("progress") ||
    userText.includes("how am i doing") ||
    userText.includes("how are my") ||
    userText.includes("intake") ||
    userText.includes("calories") ||
    userText.includes("macros");

  const userAsked =
    (mentionsToday && mentionsGoalOrProgress) ||
    userText.includes("how am i doing") ||
    userText.includes("against my goal") ||
    userText.includes("today's progress") ||
    userText.includes("today progress") ||
    userText.includes("daily progress") ||
    userText.includes("calories left") ||
    userText.includes("remaining today");

  // 2. Check if the assistant message contains today's progress or macro breakdown
  const hasCalorieProgress =
    assistantText.includes("calories:") ||
    assistantText.includes("calorie goal") ||
    /consumed\s+[\d,]+\s*(?:kcal|calories)?\s*(?:out of|of|\/)/i.test(assistantText) ||
    /[\d,]+\s*(?:kcal|calories)\s*(?:out of|of|\/)\s*[\d,]+/i.test(assistantText);

  const hasMacroProgress =
    assistantText.includes("protein:") ||
    (assistantText.includes("protein") && assistantText.includes("carbs") && assistantText.includes("fat"));

  const hasProgressPhrasing =
    assistantText.includes("progress for today") ||
    assistantText.includes("today's progress") ||
    assistantText.includes("progress today") ||
    assistantText.includes("against your goal") ||
    assistantText.includes("macro progress") ||
    assistantText.includes("remaining for the day");

  // If user asked about today's progress/goals and assistant gave numbers or progress phrasing
  if (userAsked && (hasCalorieProgress || hasProgressPhrasing)) {
    return true;
  }

  // If assistant clearly provided a today's progress breakdown with both calories and macros
  if (hasCalorieProgress && hasMacroProgress) {
    return true;
  }

  if (hasProgressPhrasing && (hasCalorieProgress || hasMacroProgress)) {
    return true;
  }

  return false;
}

export default function TodayProgressCard({ content }: TodayProgressCardProps) {
  const snapshot = useMemo(() => extractTodayProgressSnapshot(content), [content]);
  const { summary: liveSummary, loading: liveLoading } = useDailyIntake();

  const summary: NutritionProgressSummary | null = useMemo(() => {
    if (!snapshot) return liveSummary;
    return {
      totals: snapshot.totals,
      goal: {
        dailyCalorieTarget: snapshot.goal?.dailyCalorieTarget ?? liveSummary?.goal?.dailyCalorieTarget ?? null,
        proteinTargetG: snapshot.goal?.proteinTargetG ?? liveSummary?.goal?.proteinTargetG ?? null,
        carbTargetG: snapshot.goal?.carbTargetG ?? liveSummary?.goal?.carbTargetG ?? null,
        fatTargetG: snapshot.goal?.fatTargetG ?? liveSummary?.goal?.fatTargetG ?? null,
      },
    };
  }, [snapshot, liveSummary]);

  const loading = snapshot ? false : liveLoading;
  const conclusion = extractTodayProgressConclusion(content);

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <span className="block text-[13px] sm:text-sm font-bold text-text-primary dark:text-dark-text">
        Today&apos;s progress
      </span>

      <DailyOverviewProgress summary={summary} loading={loading} showTitle={false} />

      <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-text-primary dark:text-dark-text">
        {conclusion}
      </p>
    </div>
  );
}

