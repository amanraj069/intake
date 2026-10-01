"use client";

import type { ComponentType, SVGProps } from "react";
import Spinner from "@/components/ui/Spinner";
import { BowlIcon, CheckIcon, DocumentIcon, HistoryIcon, ParseIcon, SparkleIcon } from "@/components/icons";
import type { ImportStep, ImportStepKey } from "@/lib/importProgressSteps";

const STEP_ICONS: Record<ImportStepKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  upload: DocumentIcon,
  queue: HistoryIcon,
  reading: SparkleIcon,
  splitting: ParseIcon,
  filling: BowlIcon,
};

const ROW_STYLES: Record<ImportStep["status"], string> = {
  done: "text-text-primary dark:text-dark-text",
  active: "bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text font-medium",
  pending: "text-text-secondary dark:text-dark-text-secondary opacity-50",
};

function StepIndicator({ status }: { status: ImportStep["status"] }) {
  if (status === "done") return <CheckIcon className="h-4 w-4 text-accent dark:text-accent-dark" />;
  if (status === "active") return <Spinner size="sm" className="text-accent dark:text-accent-dark" />;
  return <span className="h-4 w-4 rounded-full border border-dashed border-current" aria-hidden="true" />;
}

interface ImportStepRowProps {
  step: ImportStep;
  /** Extra context for the active step, e.g. that the server is retrying. */
  note?: string | null;
}

export default function ImportStepRow({ step, note }: ImportStepRowProps) {
  const Icon = STEP_ICONS[step.key];

  return (
    <li
      className={`flex items-start sm:items-center gap-2.5 sm:gap-3 rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-[13px] sm:text-sm transition-colors duration-300 ${ROW_STYLES[step.status]}`}
    >
      <Icon className="mt-px sm:mt-0 h-4 w-4 shrink-0 text-text-secondary dark:text-dark-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="leading-snug break-words">{step.label}</p>
        {note && <p className="mt-0.5 text-xs font-light text-text-secondary dark:text-dark-text-secondary">{note}</p>}
      </div>
      <span className="mt-px sm:mt-0 flex h-4 w-4 shrink-0 items-center justify-center">
        <StepIndicator status={step.status} />
      </span>
    </li>
  );
}
