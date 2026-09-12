"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { MealFormValues, MicronutrientRow } from "@/lib/validation/mealForm";
import type { MealType } from "@/types/nutrition";

interface FillWithJsonProps {
  values: MealFormValues;
  rows: MicronutrientRow[];
  submitting: boolean;
  submitLabel: string;
  onUpdateValues: (values: MealFormValues) => void;
  onUpdateRows: (rows: MicronutrientRow[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function generateMealJson(values: MealFormValues, rows: MicronutrientRow[]): string {
  const microsObj: Record<string, { amount: number | string; unit: string }> = {};
  for (const r of rows) {
    if (r.name.trim()) {
      const num = Number(r.amount);
      microsObj[r.name.trim()] = {
        amount: !isNaN(num) && r.amount.trim() !== "" ? num : r.amount || "",
        unit: r.unit || "mg",
      };
    }
  }

  const hasItems = Object.keys(microsObj).length > 0;
  const microsLines = hasItems
    ? JSON.stringify(microsObj, null, 2)
        .split("\n")
        .map((line, i) => (i === 0 ? line : "  " + line))
        .join("\n")
    : `{\n    "Vitamin C": {\n      "amount": "",\n      "unit": "mg"\n    }\n  }`;

  return `{
  // — Step 1 · Meal —
  "mealType": "${values.mealType || ""}",
  // one of: breakfast, lunch, snack, dinner
  "foodName": "${(values.foodName || "").replace(/"/g, '\\"')}",
  "date": "${values.date || ""}",
  "quantity": "${values.quantity || ""}",
  "servingSize": "${values.servingSize || ""}", // weight in grams (g)

  // — Step 2 · Calories (kcal) and Macros (weights in grams / g) —
  "calories": "${values.calories || ""}", // in kcal
  "proteinG": "${values.proteinG || ""}", // weight in grams (g)
  "carbG": "${values.carbG || ""}", // weight in grams (g)
  "fatG": "${values.fatG || ""}", // weight in grams (g)

  // — Step 3 · Micronutrients (all weights in milligrams / mg) —
  // Example structure (internal JSON format):
  // "micros": {
  //   "Vitamin C": {
  //     "amount": 60,
  //     "unit": "mg"
  //   },
  //   "Iron": {
  //     "amount": 8,
  //     "unit": "mg"
  //   }
  // }
  // (Both { "amount": ..., "unit": "mg" } and simple amounts like "Vitamin C": 60 are supported)
  // Common nutrients: "Vitamin C", "Vitamin D", "Vitamin B12", "Iron", "Calcium", "Magnesium", "Zinc", "Potassium", "Sodium"
  "micros": ${microsLines}
}`;
}

export function stripJsonComments(jsonWithComments: string): string {
  // Strip markdown code fences if wrapped in ```json ... ```
  let text = jsonWithComments.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  // Strip single-line comments // ... but preserve within quoted strings
  const withoutComments = text.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*$)/gm,
    (match, comment) => (comment ? "" : match)
  );
  // Strip trailing commas before } or ]
  return withoutComments.replace(/,(\s*[}\]])/g, "$1");
}

export function parseMealJson(text: string): { data?: Record<string, unknown>; error?: string } {
  try {
    const cleaned = stripJsonComments(text);
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "JSON must be a root object { ... }" };
    }
    return { data: parsed as Record<string, unknown> };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid JSON syntax";
    return { error: msg };
  }
}

export default function FillWithJson({
  values,
  rows,
  submitting,
  submitLabel,
  onUpdateValues,
  onUpdateRows,
  onClose,
  onSubmit,
}: FillWithJsonProps) {
  const [jsonText, setJsonText] = useState(() => generateMealJson(values, rows));
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopyForLlm() {
    const promptText = `Please estimate or extract the nutritional information for the following meal and return it strictly in this JSON format:

${jsonText.trim()}`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = promptText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleTextChange(newText: string) {
    setJsonText(newText);
    const res = parseMealJson(newText);

    if (res.error || !res.data) {
      setParseError(res.error || "Invalid JSON syntax");
      return;
    }

    setParseError(null);
    const data = res.data;
    const nextValues: MealFormValues = { ...values };

    if (data.mealType && typeof data.mealType === "string") {
      const mt = data.mealType.toLowerCase().trim();
      if (["breakfast", "lunch", "snack", "dinner"].includes(mt)) {
        nextValues.mealType = mt as MealType;
      }
    }
    if (data.foodName !== undefined) nextValues.foodName = String(data.foodName);
    if (data.name !== undefined && data.foodName === undefined) nextValues.foodName = String(data.name);
    if (data.date !== undefined) nextValues.date = String(data.date);
    if (data.quantity !== undefined) nextValues.quantity = String(data.quantity);
    if (data.servingSize !== undefined) nextValues.servingSize = String(data.servingSize);
    if (data.amount !== undefined && data.servingSize === undefined) nextValues.servingSize = String(data.amount);
    if (data.calories !== undefined) nextValues.calories = String(data.calories);
    if (data.proteinG !== undefined) nextValues.proteinG = String(data.proteinG);
    if (data.protein !== undefined && data.proteinG === undefined) nextValues.proteinG = String(data.protein);
    if (data.carbG !== undefined) nextValues.carbG = String(data.carbG);
    if (data.carbs !== undefined && data.carbG === undefined) nextValues.carbG = String(data.carbs);
    if (data.fatG !== undefined) nextValues.fatG = String(data.fatG);
    if (data.fat !== undefined && data.fatG === undefined) nextValues.fatG = String(data.fat);

    onUpdateValues(nextValues);

    if (data.micros && typeof data.micros === "object" && !Array.isArray(data.micros)) {
      const newRows: MicronutrientRow[] = Object.entries(data.micros)
        .filter(([name]) => name.trim() !== "")
        .map(([name, val], index) => {
          let amount = "";
          let unit = "mg";
          if (typeof val === "object" && val !== null) {
            const vObj = val as { amount?: unknown; unit?: unknown };
            amount = vObj.amount !== undefined && vObj.amount !== null ? String(vObj.amount).trim() : "";
            unit = String(vObj.unit || "mg").trim();
          } else {
            amount = val !== undefined && val !== null ? String(val).trim() : "";
          }
          return {
            id: `micronutrient-json-${index + 1}`,
            name: name.trim(),
            amount,
            unit: unit || "mg",
          };
        })
        .filter((r) => r.amount !== "");
      onUpdateRows(newRows);
    } else if (Array.isArray(data.micros)) {
      const newRows: MicronutrientRow[] = data.micros
        .map((item, index) => {
          if (typeof item === "object" && item !== null) {
            const mItem = item as { name?: unknown; amount?: unknown; unit?: unknown };
            return {
              id: `micronutrient-json-${index + 1}`,
              name: String(mItem.name ?? "").trim(),
              amount: String(mItem.amount ?? "").trim(),
              unit: String(mItem.unit ?? "mg").trim() || "mg",
            };
          }
          return {
            id: `micronutrient-json-${index + 1}`,
            name: String(item ?? "").trim(),
            amount: "",
            unit: "mg",
          };
        })
        .filter((r) => r.name !== "" && r.amount !== "");
      onUpdateRows(newRows);
    }
  }

  function handleResetTemplate() {
    const template = generateMealJson(
      {
        mealType: "breakfast",
        foodName: "",
        quantity: "1",
        servingSize: "100",
        calories: "",
        proteinG: "",
        carbG: "",
        fatG: "",
        date: values.date || "",
      },
      []
    );
    handleTextChange(template);
  }

  return (
    <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-text-primary dark:text-dark-text">
          Fill with JSON
        </h2>
        <button
          type="button"
          onClick={handleResetTemplate}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset template</span>
        </button>
      </div>

      <div className="relative rounded-xl border border-input-border dark:border-dark-input-border bg-black/[0.03] dark:bg-[#0E121B] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] p-4 sm:p-5">
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={22}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full bg-transparent font-mono text-xs sm:text-sm text-text-primary dark:text-[#E2E8F0] leading-relaxed focus:outline-none resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCopyForLlm}
            aria-label="Copy prompt and JSON template for an LLM"
            className={`inline-flex items-center gap-2.5 h-10 sm:h-11 px-4.5 !rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] ${
              copied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#141824] hover:bg-black/[0.06] dark:hover:bg-[#1B2132] hover:border-black/20 dark:hover:border-white/20 text-text-primary dark:text-[#E2E8F0]"
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied for LLM!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Copy for LLM</span>
              </>
            )}
          </button>

          {parseError && (
            <span className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{parseError}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 justify-end flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="!rounded-lg !h-10 sm:!h-11 !px-5 !py-0 !text-sm font-semibold shadow-xs"
          >
            Fill the form
          </Button>
          <Button
            type="button"
            size="md"
            loading={submitting}
            disabled={Boolean(parseError)}
            onClick={onSubmit}
            className="!rounded-lg !h-10 sm:!h-11 !px-6 !py-0 !text-sm font-semibold shadow-sm hover:shadow-md"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
