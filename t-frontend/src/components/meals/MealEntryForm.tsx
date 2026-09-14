"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import FillWithJson from "./FillWithJson";
import MealItemsSection from "./MealItemsSection";
import DraftReviewConfirmation from "./photo/DraftReviewConfirmation";
import PhotoExtractPanel from "./photo/PhotoExtractPanel";
import { useAiDraftReview } from "@/hooks/useAiDraftReview";
import { useMealItems } from "@/hooks/useMealItems";
import { toErrorMessage } from "@/lib/errorMessage";
import { todayAsInputValue } from "@/lib/formatDate";
import {
  NO_MEAL_FORM_ERRORS,
  entryToFormState,
  itemToFormValues,
  modeFor,
  validateMealForm,
  type EntryMode,
  type FoodItemFormValues,
  type MealDetails,
  type MealFormErrors,
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
  /**
   * Renders the page header. The form owns the date, so it hands the date field
   * over for the page to place among its header actions.
   */
  renderHeader: (dateField: ReactNode) => ReactNode;
  /** Shown between the header and the form, e.g. the last saved entry. */
  banner?: ReactNode;
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  return "dinner";
}

function initialState(entry: FoodEntry | undefined, defaultMealType: MealType | undefined) {
  if (entry) return entryToFormState(entry);
  return {
    details: { mealType: defaultMealType ?? getDefaultMealType(), date: "", name: "" },
    items: undefined,
    mode: "single" as EntryMode,
  };
}

export default function MealEntryForm({
  entry,
  defaultMealType,
  submitting,
  submitLabel,
  jsonMode = false,
  onCloseJsonMode,
  onSubmit,
  renderHeader,
  banner,
}: MealEntryFormProps) {
  const [initial] = useState(() => initialState(entry, defaultMealType));
  const [details, setDetails] = useState<MealDetails>(initial.details);
  const [mode, setMode] = useState<EntryMode>(initial.mode);
  const [errors, setErrors] = useState<MealFormErrors>(NO_MEAL_FORM_ERRORS);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mealItems = useMealItems(initial.items);
  const { items, replaceItems } = mealItems;
  const draftReview = useAiDraftReview();

  useEffect(() => {
    // Defaulting to today has to happen after mount: the server renders in its
    // own timezone, so seeding this during render would break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetails((current) => (current.date ? current : { ...current, date: todayAsInputValue() }));
  }, []);

  function updateDetails(changes: Partial<MealDetails>) {
    setDetails((current) => ({ ...current, ...changes }));
    setErrors((current) => ({ ...current, fields: { ...current.fields, date: undefined, name: undefined } }));
  }

  /** Fills name, items and the mode that shows them, as a photo draft or pasted JSON does. */
  function applyItems(name: string | undefined, nextItems: FoodItemFormValues[]) {
    replaceItems(nextItems);
    setDetails((current) => ({ ...current, name: name ?? "" }));
    setMode(modeFor(name, nextItems));
  }

  function applyPhotoDraft(result: NutritionExtraction) {
    applyItems(result.extraction.name, result.extraction.items.map(itemToFormValues));
    setErrors(NO_MEAL_FORM_ERRORS);
    setSubmitError(null);
    draftReview.start(result.analysis);
  }

  function discardPhotoDraft() {
    applyItems(undefined, []);
    setErrors(NO_MEAL_FORM_ERRORS);
    draftReview.clear();
  }

  function applyJson(nextDetails: MealDetails, nextItems: FoodItemFormValues[] | null) {
    setDetails(nextDetails);
    if (nextItems) applyItems(nextDetails.name, nextItems);
  }

  function entrySource(): FoodEntrySource {
    // An edit must not rewrite how the entry was originally captured.
    if (entry) return entry.source;
    return draftReview.analysis ? "ai-image" : "manual";
  }

  async function triggerSubmit() {
    setSubmitError(null);

    const { errors: nextErrors, payload } = validateMealForm({ details, items, mode }, entrySource());
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

  const dateField = (
    <div className="w-full sm:w-44 min-w-0">
      <Input
        id="date"
        label="Date eaten"
        labelClassName="sr-only"
        type="date"
        value={details.date}
        error={errors.fields.date}
        disabled={submitting}
        required
        className="!h-11 !rounded-xl text-xs sm:text-sm font-medium"
        onChange={(event) => updateDetails({ date: event.target.value })}
      />
    </div>
  );

  if (jsonMode) {
    // A single food is named by itself, so the JSON shows that name rather than a stale meal name.
    const jsonDetails = mode === "single" ? { ...details, name: items[0]?.name ?? "" } : details;

    return (
      <>
        {renderHeader(dateField)}
        {banner}
        <div className="space-y-4 sm:space-y-6">
          <FillWithJson
            details={jsonDetails}
            items={items}
            submitting={submitting}
            submitLabel={submitLabel}
            onUpdate={applyJson}
            onClose={onCloseJsonMode ?? (() => {})}
            onSubmit={triggerSubmit}
          />
          {submitError && <FormError message={submitError} />}
        </div>
      </>
    );
  }

  return (
    <>
      {renderHeader(dateField)}
      {banner}

      {/* Outside the form, so Enter in the photo description never submits the meal. */}
      {!entry && (
        <PhotoExtractPanel
          analysis={draftReview.analysis}
          disabled={submitting}
          onExtracted={applyPhotoDraft}
          onDiscard={discardPhotoDraft}
          onEnterManually={() => document.getElementById(`${items[0]?.id}-name`)?.focus()}
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6 sm:space-y-12">
        <FormSection
          title="Meal"
          description="Which meal of the day this was."
          action={
            <OptionPills
              label="Meal type"
              options={MEAL_TYPE_OPTIONS}
              value={details.mealType}
              disabled={submitting}
              size="md"
              className="w-full sm:w-auto"
              onChange={(mealType) => updateDetails({ mealType })}
            />
          }
        />

        <MealItemsSection
          mode={mode}
          mealName={details.name}
          mealItems={mealItems}
          errors={errors}
          disabled={submitting}
          onModeChange={setMode}
          onMealNameChange={(name) => updateDetails({ name })}
        />

        {draftReview.analysis && (
          <DraftReviewConfirmation
            mealType={details.mealType}
            date={details.date}
            confirmed={draftReview.confirmed}
            error={draftReview.error}
            disabled={submitting}
            onChange={draftReview.setConfirmed}
          />
        )}

        {submitError && <FormError message={submitError} />}

        <div className="flex justify-end border-t border-black/10 dark:border-white/10 pt-6 sm:pt-8">
          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}
