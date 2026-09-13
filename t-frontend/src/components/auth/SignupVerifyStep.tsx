"use client";

import { useState, type FormEvent } from "react";
import OtpField, { OTP_LENGTH } from "@/components/settings/OtpField";
import Button from "@/components/ui/Button";

interface SignupVerifyStepProps {
  busy: boolean;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onSkip: () => void;
}

export default function SignupVerifyStep({ busy, onVerify, onResend, onSkip }: SignupVerifyStepProps) {
  const [otp, setOtp] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onVerify(otp);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <OtpField value={otp} onChange={setOtp} disabled={busy} />

      <Button type="submit" loading={busy} disabled={otp.length !== OTP_LENGTH} className="w-full">
        Verify Email
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={busy}
          className="font-semibold text-accent hover:underline disabled:opacity-50 dark:text-accent-dark cursor-pointer"
        >
          Resend code
        </button>
        {/* An escape hatch: if mail delivery is down, the account must still be usable. */}
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="font-light text-text-secondary hover:text-text-primary disabled:opacity-50 dark:text-dark-text-secondary dark:hover:text-dark-text cursor-pointer"
        >
          Verify later
        </button>
      </div>
    </form>
  );
}
