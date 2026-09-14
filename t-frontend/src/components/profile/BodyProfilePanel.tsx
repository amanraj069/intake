"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import DataPair from "@/components/ui/DataPair";
import FormSection from "@/components/ui/FormSection";
import { RefreshIcon } from "@/components/icons";
import { ACTIVITY_OPTIONS } from "@/lib/bodyProfileLabels";
import { formatAmount } from "@/lib/formatNumber";
import type { BodyProfile } from "@/types/onboarding";

function calculateBmi(profile: BodyProfile): string {
  const heightM = profile.heightCm / 100;
  return (profile.weightKg / (heightM * heightM)).toFixed(1);
}

function activityLabel(profile: BodyProfile): string {
  const option = ACTIVITY_OPTIONS.find((candidate) => candidate.value === profile.activityLevel);
  return option?.label.split(":")[0] ?? profile.activityLevel;
}

/** The measurements the daily plan was built from, with a way to recalculate it. */
export default function BodyProfilePanel({ profile }: { profile: BodyProfile | null }) {
  const desktopAction = (
    <div className="hidden sm:block">
      <Link href="/onboarding">
        <Button
          variant="secondary"
          size="sm"
          className="h-9 sm:h-10 !px-3.5 sm:!px-4 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs"
        >
          <RefreshIcon className="mr-2 h-4 w-4 shrink-0" />
          <span>{profile ? "Recalculate plan" : "Set up plan"}</span>
        </Button>
      </Link>
    </div>
  );

  return (
    <FormSection
      title="Body Profile"
      description="Used to calculate your daily calorie and macro targets."
      action={desktopAction}
      alignActionWithTitle
    >
      {profile ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
            <div className="bg-white dark:bg-white/[0.08] border border-border/80 dark:border-white/10 shadow-xs rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-sm dark:hover:bg-white/[0.10] transition-all">
              <DataPair label="Height" value={`${formatAmount(profile.heightCm)} cm`} />
            </div>
            <div className="bg-white dark:bg-white/[0.08] border border-border/80 dark:border-white/10 shadow-xs rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-sm dark:hover:bg-white/[0.10] transition-all">
              <DataPair label="Weight" value={`${formatAmount(profile.weightKg)} kg`} />
            </div>
            <div className="bg-white dark:bg-white/[0.08] border border-border/80 dark:border-white/10 shadow-xs rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-sm dark:hover:bg-white/[0.10] transition-all">
              <DataPair label="BMI" value={calculateBmi(profile)} />
            </div>
            <div className="bg-white dark:bg-white/[0.08] border border-border/80 dark:border-white/10 shadow-xs rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-sm dark:hover:bg-white/[0.10] transition-all">
              <DataPair label="Activity" value={activityLabel(profile)} />
            </div>
          </div>

          {/* Mobile view only: remains at the end of the page */}
          <div className="pt-2 sm:hidden">
            <Link href="/onboarding" className="w-full">
              <Button
                variant="secondary"
                size="md"
                className="w-full h-11 text-sm font-semibold rounded-xl shadow-2xs inline-flex items-center justify-center"
              >
                <RefreshIcon className="mr-2 h-4.5 w-4.5 shrink-0" />
                <span>Recalculate plan</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-light text-text-secondary dark:text-dark-text-secondary">
            No body profile yet.
          </p>
          <div className="sm:hidden">
            <Link href="/onboarding" className="w-full">
              <Button
                variant="secondary"
                size="md"
                className="w-full h-11 text-sm font-semibold rounded-xl shadow-2xs inline-flex items-center justify-center"
              >
                <RefreshIcon className="mr-2 h-4.5 w-4.5 shrink-0" />
                <span>Set up plan</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </FormSection>
  );
}
