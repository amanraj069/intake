"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { createEmptyItem, type FoodItemFormValues, type MealDetails } from "@/lib/validation/mealForm";
import { generateMealJson, mealJsonToFormState, parseMealJson } from "@/lib/mealJson";

interface FillWithJsonProps {
  details: MealDetails;
  items: FoodItemFormValues[];
  submitting: boolean;
  submitLabel: string;
  onUpdate: (details: MealDetails, items: FoodItemFormValues[] | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function FillWithJson({
  details,
  items,
  submitting,
  submitLabel,
  onUpdate,
  onClose,
  onSubmit,
}: FillWithJsonProps) {
  const [jsonText, setJsonText] = useState(() => generateMealJson(details, items));
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
    const result = parseMealJson(newText);

    if (result.error || !result.data) {
      setParseError(result.error || "Invalid JSON syntax");
      return;
    }

    setParseError(null);
    const next = mealJsonToFormState(result.data, details);
    onUpdate(next.details, next.items);
  }

  function handleResetTemplate() {
    handleTextChange(generateMealJson({ mealType: "breakfast", date: details.date, name: "" }, [createEmptyItem()]));
  }

  return (
    <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm border border-black/5 dark:border-white/10 p-4 sm:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-200">
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

        <div className="flex items-center gap-3 justify-end flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="!rounded-lg !h-10 sm:!h-11 !px-5 !py-0 !text-sm font-semibold shadow-xs w-full sm:w-auto"
          >
            Fill the form
          </Button>
          <Button
            type="button"
            size="md"
            loading={submitting}
            disabled={Boolean(parseError)}
            onClick={onSubmit}
            className="!rounded-lg !h-10 sm:!h-11 !px-6 !py-0 !text-sm font-semibold shadow-sm hover:shadow-md w-full sm:w-auto"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
