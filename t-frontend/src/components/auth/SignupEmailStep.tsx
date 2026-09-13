"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthDivider from "./AuthDivider";

interface SignupEmailStepProps {
  initialEmail: string;
  busy: boolean;
  emailTaken: boolean;
  onSubmit: (email: string) => Promise<void>;
}

export default function SignupEmailStep({
  initialEmail,
  busy,
  emailTaken,
  onSubmit,
}: SignupEmailStepProps) {
  const [email, setEmail] = useState(initialEmail);
  // The warning belongs to the address that was checked, not to whatever is typed next.
  const showTaken = emailTaken && email.trim().toLowerCase() === initialEmail;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onSubmit(email);
  }

  return (
    <div className="space-y-8">
      <GoogleButton />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={showTaken ? "An account with this email already exists" : undefined}
          required
          autoComplete="email"
          autoFocus
        />

        {showTaken && (
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
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

      <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline dark:text-accent-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}
