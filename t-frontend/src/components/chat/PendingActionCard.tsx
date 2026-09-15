"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { CheckIcon, GoalsIcon, LogMealIcon } from "@/components/icons";
import { hasFoodItems } from "@/lib/chatFoodItems";
import type { ChatThreadAction, ChatWriteTool } from "@/types/chat";
import AiAvatar from "./AiAvatar";
import MealLogCard from "./MealLogCard";
import MessageActionsMenu from "./MessageActionsMenu";
import NutritionEstimateCard from "./NutritionEstimateCard";

interface PendingActionCardProps {
  action: ChatThreadAction;
  /** The reply's stored text, offered by the actions menu's Copy item. */
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Called when "Log Another Meal" is clicked inside the receipt card. */
  onLogAnother?: () => void;
  /** Omitted while the message is still sending, so it cannot be deleted mid-flight. */
  onDelete?: () => void;
  showAvatar?: boolean;
  onSend?: (message: string) => void;
}

const TOOL_DETAILS: Record<ChatWriteTool, { title: string; Icon: typeof LogMealIcon; href: string; linkLabel: string }> = {
  logMeal: { title: "Log meal", Icon: LogMealIcon, href: "/meals", linkLabel: "View meals" },
  setGoal: { title: "Update goal", Icon: GoalsIcon, href: "/goals", linkLabel: "View goal" },
};

function ActionOutcome({ action }: { action: ChatThreadAction }) {
  const details = TOOL_DETAILS[action.payload.tool as ChatWriteTool];

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
 * MealLogCard receipt with today's nutrition progress and a food table. A
 * nutrition estimate, which is never confirmed, renders as just the food
 * table. Any other action shows its preview with Confirm/Cancel, or its
 * saved outcome.
 */
export default function PendingActionCard({
  action,
  content,
  onConfirm,
  onCancel,
  onLogAnother,
  onDelete,
  showAvatar = true,
  onSend,
}: PendingActionCardProps) {
  const undecided = action.status === "pending" || action.status === "confirming";
  const menu = onDelete ? (
    <div className="absolute top-2 right-2 z-20">
      <MessageActionsMenu content={content} onDelete={onDelete} />
    </div>
  ) : null;

  if (action.status === "confirmed" && action.payload.tool === "logMeal" && hasFoodItems(action.payload.args)) {
    return (
      <div className="flex justify-start items-end gap-2.5">
        <AiAvatar visible={showAvatar} />
        <div className="group relative w-full max-w-[94%] sm:w-[480px] sm:max-w-[480px]">
          <MealLogCard action={action.payload} onLogAnother={onLogAnother} />
          {menu}
        </div>
      </div>
    );
  }

  if (action.status === "estimate" && action.payload.tool === "estimateNutrition" && hasFoodItems(action.payload.args)) {
    return (
      <div className="flex justify-start items-end gap-2.5">
        <AiAvatar visible={showAvatar} />
        <div className="group relative w-full max-w-[94%] sm:w-[480px] sm:max-w-[480px]">
          <NutritionEstimateCard
            action={action.payload}
            onLogMeal={onSend ? (mealType) => onSend(`Log this as ${mealType}`) : undefined}
          />
          {menu}
        </div>
      </div>
    );
  }

  const { title, Icon } = TOOL_DETAILS[action.payload.tool as ChatWriteTool];

  return (
    <div className="flex justify-start items-end gap-2.5">
      <AiAvatar visible={showAvatar} />
      <div
        className={`group relative w-full max-w-[94%] sm:w-[480px] sm:max-w-[480px] rounded-2xl border bg-bg-card dark:bg-dark-bg-card p-4 space-y-3 transition-colors duration-150 ${
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
        {menu}
      </div>
    </div>
  );
}
