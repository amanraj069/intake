"use client";

import { useEffect, useState, type FormEvent } from "react";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import SegmentedControl, { type SegmentedOption } from "@/components/ui/SegmentedControl";
import MicronutrientRows from "./MicronutrientRows";
import { useMicronutrientRows } from "@/hooks/useMicronutrientRows";
import { toErrorMessage } from "@/lib/errorMessage";
import { todayAsInputValue } from "@/lib/formatDate";
import { LIMITS } from "@/lib/validation/amount";
import {
  MEAL_AMOUNT_RULES,
  validateMealForm,
  type MealAmountField,
  type MealFormErrors,
  type MealFormValues,
} from "@/lib/validation/mealForm";
import { MEAL_TYPES, type FoodEntryInput, type MealType } from "@/types/nutrition";

const MEAL_TYPE_OPTIONS: readonly SegmentedOption<MealType>[] = MEAL_TYPES.map((mealType) => ({
  value: mealType,
  label: mealType,
}));

const MEAL_FIELD_UNITS: Record<MealAmountField, string | undefined> = {
  quantity: undefined,
  calories: "kcal",
  proteinG: "g",
  carbG: "g",
  fatG: "g",
};

const EMPTY_MEAL_FORM: MealFormValues = {
  mealType: "breakfast",
  foodName: "",
  quantity: "",
  quantityUnit: "g",
  calories: "",
  proteinG: "",
  carbG: "",
  fatG: "",
  date: "",
};

const NO_ERRORS: MealFormErrors = { fields: {}, micros: {} };

interface MealEntryFormProps {
  submitting: boolean;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

export default function MealEntryForm({ submitting, onSubmit }: MealEntryFormProps) {
  const [values, setValues] = useState<MealFormValues>(EMPTY_MEAL_FORM);
  const [errors, setErrors] = useState<MealFormErrors>(NO_ERRORS);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { rows, addRow, updateRow, removeRow } = useMicronutrientRows();

  useEffect(() => {
    // Defaulting to today has to happen after mount: the server renders in its
    // own timezone, so seeding this during render would break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((current) => (current.date ? current : { ...current, date: todayAsInputValue() }));
  }, []);

  function updateField<TField extends keyof MealFormValues>(
    field: TField,
    value: MealFormValues[TField]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, fields: { ...current.fields, [field]: undefined } }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const { errors: nextErrors, payload } = validateMealForm(values, rows);
    setErrors(nextErrors);

    if (!payload) return;

    try {
      await onSubmit(payload);
    } catch (cause) {
      setSubmitError(toErrorMessage(cause, "Could not log this meal."));
    }
  }

  function renderAmountField(field: MealAmountField) {
    return (
      <AmountInput
        rule={MEAL_AMOUNT_RULES[field]}
        unit={MEAL_FIELD_UNITS[field]}
        value={values[field]}
        error={errors.fields[field]}
        disabled={submitting}
        onChange={(next) => updateField(field, next)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-12">
      <FormSection title="Meal" description="What you ate, and how much of it.">
        <SegmentedControl
          label="Meal type"
          options={MEAL_TYPE_OPTIONS}
          value={values.mealType}
          disabled={submitting}
          onChange={(mealType) => updateField("mealType", mealType)}
        />

        <Input
          id="foodName"
          label="Food name"
          placeholder="Greek yogurt"
          value={values.foodName}
          error={errors.fields.foodName}
          disabled={submitting}
          maxLength={LIMITS.foodNameLength}
          onChange={(event) => updateField("foodName", event.target.value)}
        />

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2">{renderAmountField("quantity")}</div>
          <Input
            id="quantityUnit"
            label="Unit"
            placeholder="g"
            value={values.quantityUnit}
            error={errors.fields.quantityUnit}
            disabled={submitting}
            maxLength={LIMITS.unitLength}
            onChange={(event) => updateField("quantityUnit", event.target.value)}
          />
        </div>

        <Input
          id="date"
          label="Date eaten"
          type="date"
          value={values.date}
          error={errors.fields.date}
          disabled={submitting}
          onChange={(event) => updateField("date", event.target.value)}
        />
      </FormSection>

      <FormSection title="Calories and Macros" description="Totals for the quantity above.">
        {renderAmountField("calories")}
        <div className="grid gap-6 sm:grid-cols-3">
          {renderAmountField("proteinG")}
          {renderAmountField("carbG")}
          {renderAmountField("fatG")}
        </div>
      </FormSection>

      <FormSection
        title="Micronutrients"
        description="Optional. Add any nutrient you track: name and amount."
      >
        <MicronutrientRows
          rows={rows}
          errors={errors.micros}
          summaryError={errors.microsSummary}
          disabled={submitting}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onUpdateRow={updateRow}
        />
      </FormSection>

      {submitError && <FormError message={submitError} />}

      <div className="flex justify-end border-t border-black/10 dark:border-white/10 pt-8">
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          Log Meal
        </Button>
      </div>
    </form>
  );
}
