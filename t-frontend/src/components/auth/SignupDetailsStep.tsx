"use client";

import { useState, type FormEvent } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  EMPTY_SIGNUP_PASSWORDS,
  validateSignupPassword,
  type SignupPasswordErrors,
  type SignupPasswordField,
  type SignupPasswordValues,
} from "@/lib/validation/signupForm";

interface SignupDetailsStepProps {
  email: string;
  firstName?: string;
  lastName?: string;
  busy: boolean;
  serverFieldErrors: Record<string, string>;
  onEditEmail: () => void;
  onSubmit: (details: SignupPasswordValues) => Promise<void>;
}

export default function SignupDetailsStep({
  email,
  firstName,
  lastName,
  busy,
  serverFieldErrors,
  onEditEmail,
  onSubmit,
}: SignupDetailsStepProps) {
  const [values, setValues] = useState<SignupPasswordValues>(EMPTY_SIGNUP_PASSWORDS);
  const [errors, setErrors] = useState<SignupPasswordErrors>({});

  function updateField(field: SignupPasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function errorFor(field: SignupPasswordField): string | undefined {
    return errors[field] ?? serverFieldErrors[field];
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateSignupPassword(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3.5 sm:space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface px-4 py-3 dark:bg-dark-surface">
        <div className="min-w-0">
          <p className="text-xs font-light text-text-secondary dark:text-dark-text-secondary">
            Signing up as
          </p>
          <p className="truncate text-sm font-semibold text-text-primary dark:text-dark-text">
            {firstName && lastName ? `${firstName} ${lastName} · ` : ""}
            {email}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEditEmail} disabled={busy}>
          Change
        </Button>
      </div>

      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        value={values.password}
        onChange={(event) => updateField("password", event.target.value)}
        error={errorFor("password")}
        required
        autoComplete="new-password"
        autoFocus
      />

      <Input
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        value={values.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
        error={errorFor("confirmPassword")}
        required
        autoComplete="new-password"
      />

      <Button type="submit" loading={busy} className="w-full">
        Create Account
      </Button>
    </form>
  );
}
