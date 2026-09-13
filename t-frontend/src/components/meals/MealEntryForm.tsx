"use client";

import { useEffect, useState, type FormEvent } from "react";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import MicronutrientRows from "./MicronutrientRows";
import FillWithJson from "./FillWithJson";
import DraftReviewConfirmation from "./photo/DraftReviewConfirmation";
import PhotoExtractPanel from "./photo/PhotoExtractPanel";
import { useAiDraftReview } from "@/hooks/useAiDraftReview";
import { useMicronutrientRows } from "@/hooks/useMicronutrientRows";
import { toErrorMessage } from "@/lib/errorMessage";
import { todayAsInputValue } from "@/lib/formatDate";
import { LIMITS } from "@/lib/validation/amount";
import {
  MEAL_AMOUNT_RULES,
  draftToFormValues,
  entryToFormValues,
  validateMealForm,
  type DraftFormFields,
  type MealAmountField,
  type MealFormErrors,
  type MealFormValues,
} from "@/lib/validation/mealForm";
import {
  MEAL_TYPES,
  type FoodEntry,
  type FoodEntryInput,
  type FoodEntrySource,
  type MealType,
  type NutritionExtraction,
} from "@/types/nutrition";

const MEAL_TYPE_OPTIONS: readonly PillOption<MealType>[] = MEAL_TYPES.map((mealType) => ({
  value: mealType,
  label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
}));

const MEAL_FIELD_UNITS: Record<MealAmountField, string | undefined> = {
  quantity: undefined,
  servingSize: undefined,
  calories: "kcal",
  proteinG: "g",
  carbG: "g",
  fatG: "g",
};

const EMPTY_MEAL_FORM: MealFormValues = {
  mealType: "breakfast",
  foodName: "",
  quantity: "",
  servingSize: "",
  calories: "",
  proteinG: "",
  carbG: "",
  fatG: "",
  date: "",
};

/** Clearing a photo draft empties what it filled in, and keeps the meal type and date the user chose. */
const EMPTY_DRAFT_FIELDS: DraftFormFields = {
  foodName: "",
  quantity: "",
  servingSize: "",
  calories: "",
  proteinG: "",
  carbG: "",
  fatG: "",
};

const NO_ERRORS: MealFormErrors = { fields: {}, micros: {} };

interface MealEntryFormProps {
  /** The entry being edited. Omitted when logging a new meal. */
  entry?: FoodEntry;
  /** A pre-selected meal type from URL params. Overrides time-based default if provided. */
  defaultMealType?: MealType;
  submitting: boolean;
  submitLabel: string;
  jsonMode?: boolean;
  onCloseJsonMode?: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  return "dinner";
}

export default function MealEntryForm({
  entry,
  defaultMealType,
  submitting,
  submitLabel,
  jsonMode = false,
  onCloseJsonMode,
  onSubmit,
}: MealEntryFormProps) {
  const [values, setValues] = useState<MealFormValues>(() =>
    entry
      ? entryToFormValues(entry)
      : { ...EMPTY_MEAL_FORM, mealType: defaultMealType ?? getDefaultMealType() },
  );
  const [errors, setErrors] = useState<MealFormErrors>(NO_ERRORS);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { rows, addRow, addNutrientRow, updateRow, removeRow, setAllRows, replaceWithMicros } =
    useMicronutrientRows(entry?.micros);
  const draftReview = useAiDraftReview();

  useEffect(() => {
    // Defaulting to today has to happen after mount: the server renders in its
    // own timezone, so seeding this during render would break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((current) => (current.date ? current : { ...current, date: todayAsInputValue() }));
  }, []);

  function updateField<TField extends keyof MealFormValues>(
    field: TField,
    value: MealFormValues[TField],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, fields: { ...current.fields, [field]: undefined } }));
  }

  function applyPhotoDraft(result: NutritionExtraction) {
    setValues((current) => ({ ...current, ...draftToFormValues(result.extraction) }));
    replaceWithMicros(result.extraction.micros);
    setErrors(NO_ERRORS);
    setSubmitError(null);
    draftReview.start(result.analysis);
  }

  function discardPhotoDraft() {
    setValues((current) => ({ ...current, ...EMPTY_DRAFT_FIELDS }));
    replaceWithMicros(undefined);
    setErrors(NO_ERRORS);
    draftReview.clear();
  }

  function entrySource(): FoodEntrySource {
    // An edit must not rewrite how the entry was originally captured.
    if (entry) return entry.source;
    return draftReview.analysis ? "ai-image" : "manual";
  }

  async function triggerSubmit() {
    setSubmitError(null);

    const { errors: nextErrors, payload } = validateMealForm(values, rows, entrySource());
    setErrors(nextErrors);

    const reviewed = draftReview.checkReadyToSave();
    if (!payload || !reviewed) return;

    if (draftReview.analysis) {
      payload.confidenceScore = draftReview.analysis.confidence.score;
      payload.confidenceLevel = draftReview.analysis.confidence.level;
      payload.extractionAnalysis = draftReview.analysis;
    }

    try {
      await onSubmit(payload);
    } catch (cause) {
      setSubmitError(toErrorMessage(cause, "Could not save this meal."));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await triggerSubmit();
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

  if (jsonMode) {
    return (
      <div className="space-y-6">
        <FillWithJson
          values={values}
          rows={rows}
          submitting={submitting}
          submitLabel={submitLabel}
          onUpdateValues={setValues}
          onUpdateRows={setAllRows}
          onClose={onCloseJsonMode ?? (() => {})}
          onSubmit={triggerSubmit}
        />
        {submitError && <FormError message={submitError} />}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Outside the form, so Enter in the photo description never submits the meal. */}
      {!entry && (
        <PhotoExtractPanel
          analysis={draftReview.analysis}
          disabled={submitting}
          onExtracted={applyPhotoDraft}
          onDiscard={discardPhotoDraft}
          onEnterManually={() => document.getElementById("foodName")?.focus()}
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-12">
        <FormSection
          title="Meal"
          description="What you ate, and how much of it."
          action={
            <OptionPills
              label="Meal type"
              options={MEAL_TYPE_OPTIONS}
              value={values.mealType}
              disabled={submitting}
              size="md"
              className="w-full sm:w-auto"
              onChange={(mealType) => updateField("mealType", mealType)}
            />
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id="foodName"
              label="Food name"
              placeholder="Greek yogurt"
              value={values.foodName}
              error={errors.fields.foodName}
              disabled={submitting}
              required
              maxLength={LIMITS.foodNameLength}
              onChange={(event) => updateField("foodName", event.target.value)}
            />
            <Input
              id="date"
              label="Date eaten"
              type="date"
              value={values.date}
              error={errors.fields.date}
              disabled={submitting}
              required
              onChange={(event) => updateField("date", event.target.value)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {renderAmountField("quantity")}
            {renderAmountField("servingSize")}
          </div>
        </FormSection>

        <FormSection
          title="Calories and Macros"
          description="Totals for the quantity above. Macro weights in grams (g)."
        >
          {renderAmountField("calories")}
          <div className="grid gap-6 sm:grid-cols-3">
            {renderAmountField("proteinG")}
            {renderAmountField("carbG")}
            {renderAmountField("fatG")}
          </div>
        </FormSection>

        <FormSection
          title="Micronutrients"
          description="Optional. Add any nutrient you track (all weights in mg)."
        >
          <MicronutrientRows
            rows={rows}
            errors={errors.micros}
            summaryError={errors.microsSummary}
            disabled={submitting}
            onAddRow={addRow}
            onAddNutrientRow={addNutrientRow}
            onRemoveRow={removeRow}
            onUpdateRow={updateRow}
          />
        </FormSection>

        {draftReview.analysis && (
          <DraftReviewConfirmation
            mealType={values.mealType}
            date={values.date}
            confirmed={draftReview.confirmed}
            error={draftReview.error}
            disabled={submitting}
            onChange={draftReview.setConfirmed}
          />
        )}

        {submitError && <FormError message={submitError} />}

        <div className="flex justify-end border-t border-black/10 dark:border-white/10 pt-8">
          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
