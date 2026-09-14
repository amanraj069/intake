"use client";

import { useDailyIntake } from "@/hooks/useDailyIntake";
import type { ChatThreadMessage } from "@/types/chat";
import DailyOverviewProgress from "./DailyOverviewProgress";

interface TodayProgressCardProps {
  content: string;
}

const DEFAULT_CONCLUSION =
  "You have plenty of calories and macros remaining for the day. Let me know if you would like to log anything else or want ideas to hit your targets.";

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

  const userAsked =
    userText.includes("how am i doing today against my goal") ||
    userText.includes("how am i doing today") ||
    userText.includes("against my goal") ||
    userText.includes("today's progress") ||
    userText.includes("today progress");

  const assistantAnswered =
    assistantText.includes("against your goal") ||
    assistantText.includes("doing today against your goal") ||
    (assistantText.includes("calories:") && assistantText.includes("protein:") && assistantText.includes("left"));

  return Boolean(userAsked || assistantAnswered);
}

export default function TodayProgressCard({ content }: TodayProgressCardProps) {
  const { summary, loading } = useDailyIntake();
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
