"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useShareMeal } from "@/hooks/useShareMeal";
import type { FoodEntry } from "@/types/nutrition";

interface ShareMealDialogProps {
  /** The meal being shared, or null while the dialog is closed. */
  meal: FoodEntry | null;
  onClose: () => void;
}

/** Asks for the recipient's email and shares the meal with that account. */
export default function ShareMealDialog({ meal, onClose }: ShareMealDialogProps) {
  const [email, setEmail] = useState("");
  const { sharing, fieldError, submitError, shareMeal, clearErrors } = useShareMeal();
  const toast = useToast();

  useEffect(() => {
    if (!meal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !sharing) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [meal, sharing, onClose]);

  if (!meal) return null;

  function close() {
    setEmail("");
    clearErrors();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meal) return;

    const shared = await shareMeal(meal._id, email);
    if (!shared) return;

    toast.success(`${meal.name} shared with ${email.trim()}.`);
    close();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-meal-dialog-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={close}
        disabled={sharing}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 cursor-default"
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card shadow-xl"
      >
        <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-5">
          <div>
            <h2
              id="share-meal-dialog-title"
              className="text-lg font-bold tracking-tight text-text-primary dark:text-dark-text"
            >
              Share meal
            </h2>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
              &quot;{meal.name}&quot; will appear on their Shared page.
            </p>
          </div>

          <Input
            label="Their email"
            type="email"
            autoComplete="off"
            autoFocus
            placeholder="name@example.com"
            value={email}
            error={fieldError ?? undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldError) clearErrors();
            }}
          />

          {submitError && <FormError message={submitError} />}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border dark:border-dark-border px-6 py-5 sm:px-8">
          <Button type="button" variant="secondary" size="sm" onClick={close} disabled={sharing}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={sharing}>
            Share
          </Button>
        </div>
      </form>
    </div>
  );
}
