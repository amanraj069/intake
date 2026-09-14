"use client";

import { useState, type FormEvent } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import OptionPills from "@/components/ui/OptionPills";
import { ACTIVITY_OPTIONS, SEX_OPTIONS } from "@/lib/bodyProfileLabels";
import {
  BODY_MEASURE_RULES,
  validateBodyProfileForm,
  type BodyMeasureField,
  type BodyProfileFormErrors,
  type BodyProfileFormValues,
} from "@/lib/validation/bodyProfileForm";
import type { ActivityLevel, BodyProfile } from "@/types/onboarding";

interface BodyProfileFormProps {
  initialValues: BodyProfileFormValues;
  busy: boolean;
  onSubmit: (profile: BodyProfile) => Promise<void>;
}

const MEASURE_PLACEHOLDERS: Record<BodyMeasureField, string> = {
  weightKg: "72",
  heightCm: "175",
  goalWeightKg: "68",
  age: "28",
};

export default function BodyProfileForm({ initialValues, busy, onSubmit }: BodyProfileFormProps) {
  const [values, setValues] = useState<BodyProfileFormValues>(initialValues);
  const [errors, setErrors] = useState<BodyProfileFormErrors>({});

  function updateMeasure(field: BodyMeasureField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { errors: nextErrors, profile } = validateBodyProfileForm(values);
    setErrors(nextErrors);
    if (profile) void onSubmit(profile);
  }

  function renderMeasure(field: BodyMeasureField) {
    const rule = BODY_MEASURE_RULES[field];
    return (
      <Input
        id={field}
        label={`${rule.label} (${rule.unit})`}
        type="number"
        inputMode={rule.wholeNumber ? "numeric" : "decimal"}
        min={rule.min}
        max={rule.max}
        step={rule.wholeNumber ? 1 : "any"}
        placeholder={MEASURE_PLACEHOLDERS[field]}
        value={values[field]}
        error={errors[field]}
        disabled={busy}
        required
        onChange={(event) => updateMeasure(field, event.target.value)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3.5 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {renderMeasure("heightCm")}
        {renderMeasure("age")}
        {renderMeasure("weightKg")}
        {renderMeasure("goalWeightKg")}
      </div>

      <div>
        <span className="mb-1.5 sm:mb-2 block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary">
          Sex
        </span>
        <OptionPills
          label="Sex"
          options={SEX_OPTIONS}
          value={values.sex}
          disabled={busy}
          fullWidth
          size="md"
          onChange={(sex) => setValues((current) => ({ ...current, sex }))}
        />
      </div>

      <Select
        label="Activity level"
        options={ACTIVITY_OPTIONS}
        value={values.activityLevel}
        disabled={busy}
        onChange={(event) =>
          setValues((current) => ({ ...current, activityLevel: event.target.value as ActivityLevel }))
        }
      />

      <Button type="submit" loading={busy} className="w-full">
        {busy ? "Calculating your plan" : "Calculate my plan"}
      </Button>
    </form>
  );
}
