"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { useToast } from "@/components/ui/Toast";
import { useRevokeMealAccess } from "@/hooks/useRevokeMealAccess";
import type { SentMeal } from "@/types/sharedMeal";
import RecipientCheckbox from "./RecipientCheckbox";

interface ManageAccessDialogProps {
  /** The shared meal being managed, or null while the dialog is closed. */
  sentMeal: SentMeal | null;
  onClose: () => void;
  /** Called after access changed, so the list can refetch. */
  onUpdated: () => void;
}

function revokedSummary(count: number): string {
  return count === 1 ? "1 person no longer has access." : `${count} people no longer have access.`;
}

/** Lists everyone a meal is shared with; unticking people and saving revokes their access. */
export default function ManageAccessDialog({ sentMeal, onClose, onUpdated }: ManageAccessDialogProps) {
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const { updating, updateError, revokeAccess, clearError } = useRevokeMealAccess();
  const toast = useToast();

  useEffect(() => {
    if (!sentMeal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !updating) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sentMeal, updating, onClose]);

  if (!sentMeal) return null;

  function close() {
    setRevokedIds(new Set());
    clearError();
    onClose();
  }

  function toggleAccess(userId: string, keepAccess: boolean) {
    setRevokedIds((current) => {
      const next = new Set(current);
      if (keepAccess) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentMeal || revokedIds.size === 0) return;

    const access = await revokeAccess(sentMeal.meal._id, [...revokedIds]);
    if (!access) return;

    toast.success(revokedSummary(access.revokedCount));
    onUpdated();
    close();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-access-dialog-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={close}
        disabled={updating}
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
              id="manage-access-dialog-title"
              className="text-lg font-bold tracking-tight text-text-primary dark:text-dark-text"
            >
              Manage access
            </h2>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
              People who can see &quot;{sentMeal.meal.name}&quot;. Untick anyone who should no longer see it.
            </p>
          </div>

          <fieldset className="-mx-3 max-h-72 overflow-y-auto space-y-0.5">
            <legend className="sr-only">People with access</legend>
            {sentMeal.sharedWith.map((recipient) => (
              <RecipientCheckbox
                key={recipient.id}
                recipient={recipient}
                checked={!revokedIds.has(recipient.id)}
                disabled={updating}
                onChange={(keepAccess) => toggleAccess(recipient.id, keepAccess)}
              />
            ))}
          </fieldset>

          {updateError && <FormError message={updateError} />}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border dark:border-dark-border px-6 py-5 sm:px-8">
          <Button type="button" variant="secondary" size="sm" onClick={close} disabled={updating}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={updating} disabled={revokedIds.size === 0}>
            Update access
          </Button>
        </div>
      </form>
    </div>
  );
}
