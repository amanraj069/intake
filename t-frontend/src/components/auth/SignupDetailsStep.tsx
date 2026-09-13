"use client";

import { useState, type FormEvent } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  EMPTY_SIGNUP_DETAILS,
  validateSignupDetails,
  type SignupDetailsErrors,
  type SignupDetailsField,
  type SignupDetailsValues,
} from "@/lib/validation/signupForm";

interface SignupDetailsStepProps {
  email: string;
  busy: boolean;
  serverFieldErrors: Record<string, string>;
  onEditEmail: () => void;
  onSubmit: (details: SignupDetailsValues) => Promise<void>;
}

export default function SignupDetailsStep({
  email,
  busy,
  serverFieldErrors,
  onEditEmail,
  onSubmit,
}: SignupDetailsStepProps) {
  const [values, setValues] = useState<SignupDetailsValues>(EMPTY_SIGNUP_DETAILS);
  const [errors, setErrors] = useState<SignupDetailsErrors>({});

  function updateField(field: SignupDetailsField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function errorFor(field: SignupDetailsField): string | undefined {
    return errors[field] ?? serverFieldErrors[field];
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateSignupDetails(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface px-4 py-3 dark:bg-dark-surface">
        <div className="min-w-0">
          <p className="text-xs font-light text-text-secondary dark:text-dark-text-secondary">
            Signing up as
          </p>
          <p className="truncate text-sm font-semibold text-text-primary dark:text-dark-text">
            {email}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEditEmail} disabled={busy}>
          Change
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          value={values.firstName}
          onChange={(event) => updateField("firstName", event.target.value)}
          error={errorFor("firstName")}
          required
          autoComplete="given-name"
          autoFocus
        />
        <Input
          label="Last name"
          value={values.lastName}
          onChange={(event) => updateField("lastName", event.target.value)}
          error={errorFor("lastName")}
          required
          autoComplete="family-name"
        />
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
