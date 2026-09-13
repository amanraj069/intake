"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import DataPair from "@/components/ui/DataPair";
import FormSection from "@/components/ui/FormSection";
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
  const action = (
    <Link href="/onboarding">
      <Button variant="secondary" size="sm" className="w-full sm:w-auto">
        {profile ? "Recalculate plan" : "Set up plan"}
      </Button>
    </Link>
  );

  return (
    <FormSection
      title="Body Profile"
      description="Used to calculate your daily calorie and macro targets."
      action={action}
    >
      {profile ? (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <DataPair label="Height" value={`${formatAmount(profile.heightCm)} cm`} />
          <DataPair label="Weight" value={`${formatAmount(profile.weightKg)} kg`} />
          <DataPair label="BMI" value={calculateBmi(profile)} />
          <DataPair label="Activity" value={activityLabel(profile)} />
        </div>
      ) : (
        <p className="text-sm font-light text-text-secondary dark:text-dark-text-secondary">
          No body profile yet.
        </p>
      )}
    </FormSection>
  );
}
