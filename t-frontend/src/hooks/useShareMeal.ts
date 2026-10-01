"use client";

import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import { emailError } from "@/lib/validation/email";

/** Failures the user can fix by changing the email, so they sit under the field. */
const EMAIL_FIELD_ERROR_CODES = new Set(["RECIPIENT_NOT_FOUND", "CANNOT_SHARE_WITH_SELF", "ALREADY_SHARED"]);

interface UseShareMealResult {
  sharing: boolean;
  /** A problem with the email typed, shown under the field. */
  fieldError: string | null;
  /** Anything else, such as the server being unreachable. */
  submitError: string | null;
  /** Resolves true once the meal is shared, false when it was not. */
  shareMeal: (mealId: string, email: string) => Promise<boolean>;
  clearErrors: () => void;
}

function isEmailFieldFailure(cause: unknown): cause is ApiError {
  return cause instanceof ApiError && cause.code !== undefined && EMAIL_FIELD_ERROR_CODES.has(cause.code);
}

/**
 * Shares a meal with another user by email. The sharer is never sent: the
 * server takes it from the session, so a client cannot share as someone else.
 */
export function useShareMeal(): UseShareMealResult {
  const [sharing, setSharing] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setFieldError(null);
    setSubmitError(null);
  }, []);

  const shareMeal = useCallback(async (mealId: string, email: string): Promise<boolean> => {
    clearErrors();

    const invalidEmail = emailError(email);
    if (invalidEmail) {
      setFieldError(invalidEmail);
      return false;
    }

    setSharing(true);
    try {
      await api.shareMeal({ mealId, email: email.trim() });
      return true;
    } catch (cause) {
      if (isEmailFieldFailure(cause)) {
        setFieldError(cause.message);
      } else {
        setSubmitError(toErrorMessage(cause, "Could not share this meal."));
      }
      return false;
    } finally {
      setSharing(false);
    }
  }, [clearErrors]);

  return { sharing, fieldError, submitError, shareMeal, clearErrors };
}
