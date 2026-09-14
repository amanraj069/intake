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
    <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-3.5 sm:p-8 space-y-3.5 sm:space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-bold text-text-primary dark:text-dark-text truncate">
          Fill with JSON
        </h2>
        <button
          type="button"
          onClick={handleResetTemplate}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-[0.98] shrink-0"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset template</span>
        </button>
      </div>

      <div className="relative rounded-xl border border-input-border dark:border-dark-input-border bg-black/[0.03] dark:bg-[#0E121B] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] p-3 sm:p-5 overflow-hidden">
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={16}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full bg-transparent font-mono text-xs sm:text-sm text-text-primary dark:text-[#E2E8F0] leading-relaxed focus:outline-none resize-y min-h-[260px] sm:min-h-[360px]"
        />
      </div>

      <div className="space-y-3 pt-1">
        {parseError && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="break-words leading-relaxed">{parseError}</span>
          </div>
        )}

        {/* Action buttons:
            Mobile (<sm):
              Row 1: [ Copy for LLM ] and [ Fill the form ] in one 2-column grid row
              Row 2: [ Log Meal ] (full-width)
            Desktop (>=sm):
              Left:  [ Copy for LLM ]
              Right: [ Fill the form ] [ Log Meal ]
        */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={handleCopyForLlm}
              aria-label="Copy prompt and JSON template for an LLM"
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-11 px-2.5 sm:px-4.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] w-full sm:w-auto min-w-0 ${
                copied
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card hover:bg-bg-surface dark:hover:bg-dark-surface text-text-primary dark:text-dark-text"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="truncate">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary dark:text-dark-text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span className="truncate">Copy for LLM</span>
                </>
              )}
            </button>

            {/* Mobile: "Fill the form" button in the same row as Copy for LLM */}
            <div className="block sm:hidden w-full min-w-0">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                className="!rounded-xl !h-10 !px-2.5 !py-0 !text-xs font-semibold shadow-xs w-full justify-center min-w-0"
              >
                <span className="truncate">Fill the form</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 sm:justify-end w-full sm:w-auto">
            {/* Desktop: "Fill the form" sits next to submit button */}
            <div className="hidden sm:block">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                className="!rounded-xl !h-11 !px-5 !py-0 !text-sm font-semibold shadow-xs w-auto"
              >
                Fill the form
              </Button>
            </div>

            <Button
              type="button"
              size="md"
              loading={submitting}
              disabled={Boolean(parseError)}
              onClick={onSubmit}
              className="!rounded-xl !h-10 sm:!h-11 !px-5 sm:!px-6 !py-0 !text-xs sm:!text-sm font-semibold shadow-sm hover:shadow-md w-full sm:w-auto justify-center"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
