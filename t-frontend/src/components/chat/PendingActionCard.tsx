"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { CheckIcon, GoalsIcon, LogMealIcon } from "@/components/icons";
import type { ChatThreadAction, ChatWriteTool } from "@/types/chat";
import AiAvatar from "./AiAvatar";
import MealLogCard from "./MealLogCard";

interface PendingActionCardProps {
  action: ChatThreadAction;
  onConfirm: () => void;
  onCancel: () => void;
  /** Called when "Log Another Meal" is clicked inside the receipt card. */
  onLogAnother?: () => void;
}

const TOOL_DETAILS: Record<ChatWriteTool, { title: string; Icon: typeof LogMealIcon; href: string; linkLabel: string }> = {
  logMeal: { title: "Log meal", Icon: LogMealIcon, href: "/meals", linkLabel: "View meals" },
  setGoal: { title: "Update goal", Icon: GoalsIcon, href: "/goals", linkLabel: "View goal" },
};

function ActionOutcome({ action }: { action: ChatThreadAction }) {
  const details = TOOL_DETAILS[action.payload.tool];

  if (action.status === "cancelled") {
    return <p className="text-xs font-light text-text-secondary dark:text-dark-text-secondary">Cancelled. Nothing was saved.</p>;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-accent dark:text-accent-dark">
        <CheckIcon className="h-3.5 w-3.5" />
        Saved
      </p>
      <Link
        href={details.href}
        className="text-xs font-semibold text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text transition-colors"
      >
        {details.linkLabel}
      </Link>
    </div>
  );
}

/**
 * A change the assistant proposed, shown as a card rather than a bubble so it
 * is unmistakably something the user still has to approve.
 *
 * When a logMeal action is confirmed, the card transforms into a structured
 * MealLogCard receipt with macro rings, food table, and daily progress.
 */
export default function PendingActionCard({ action, onConfirm, onCancel, onLogAnother }: PendingActionCardProps) {
  const { title, Icon } = TOOL_DETAILS[action.payload.tool];
  const undecided = action.status === "pending" || action.status === "confirming";

  // ── Confirmed logMeal → show structured receipt card ──
  if (action.status === "confirmed" && action.payload.tool === "logMeal") {
    return (
      <div className="flex justify-start gap-2.5">
        <AiAvatar className="mt-1" />
        <div className="w-full sm:max-w-lg">
          <MealLogCard action={action.payload} onLogAnother={onLogAnother} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <AiAvatar className="mt-1" />
      <div
        className={`w-full max-w-[94%] sm:max-w-md rounded-2xl border bg-bg-card dark:bg-dark-bg-card p-4 space-y-3 transition-colors duration-150 ${
          undecided ? "border-accent/50 dark:border-accent-dark/50 shadow-sm" : "border-border dark:border-dark-border"
        }`}
      >
        <p className="flex items-center gap-2 text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
          <Icon className="h-3.5 w-3.5" />
          {title}
          {undecided && <span className="font-light">: needs your confirmation</span>}
        </p>

        <p className="text-[13px] sm:text-sm leading-relaxed text-text-primary dark:text-dark-text">{action.payload.preview}</p>

        {action.error && (
          <p role="alert" className="text-xs text-error dark:text-error-dark">
            {action.error}
          </p>
        )}

        {undecided ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={onConfirm} loading={action.status === "confirming"}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={action.status === "confirming"}>
              Cancel
            </Button>
          </div>
        ) : (
          <ActionOutcome action={action} />
        )}
      </div>
    </div>
  );
}
