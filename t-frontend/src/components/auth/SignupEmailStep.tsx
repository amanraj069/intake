"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthDivider from "./AuthDivider";
import {
  validateSignupStep1,
  type SignupStep1Errors,
} from "@/lib/validation/signupForm";

interface SignupEmailStepProps {
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail: string;
  busy: boolean;
  emailTaken: boolean;
  onSubmit: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
}

export default function SignupEmailStep({
  initialFirstName = "",
  initialLastName = "",
  initialEmail,
  busy,
  emailTaken,
  onSubmit,
}: SignupEmailStepProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<SignupStep1Errors>({});

  // The warning belongs to the address that was checked, not to whatever is typed next.
  const showTaken = emailTaken && email.trim().toLowerCase() === initialEmail;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateSignupStep1({ firstName, lastName, email });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit({ firstName, lastName, email });
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <GoogleButton />
      <AuthDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Input
            label="First name"
            placeholder="Aarav"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
              setErrors((current) => ({ ...current, firstName: undefined }));
            }}
            error={errors.firstName}
            required
            autoComplete="given-name"
            autoFocus
          />
          <Input
            label="Last name"
            placeholder="Sharma"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
              setErrors((current) => ({ ...current, lastName: undefined }));
            }}
            error={errors.lastName}
            required
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="aarav.sharma@gmail.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email || (showTaken ? "An account with this email already exists" : undefined)}
          required
          autoComplete="email"
        />

        {showTaken && (
          <p className="text-xs sm:text-sm text-text-secondary dark:text-dark-text-secondary">
            Is this you?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent hover:underline dark:text-accent-dark"
            >
              Sign in instead
            </Link>
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          Continue
        </Button>
      </form>

      <p className="text-center text-xs sm:text-sm text-text-secondary dark:text-dark-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline dark:text-accent-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}
