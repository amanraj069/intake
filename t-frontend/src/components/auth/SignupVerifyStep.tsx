"use client";

import { useState, useEffect, type FormEvent } from "react";
import OtpField, { OTP_LENGTH } from "@/components/settings/OtpField";
import Button from "@/components/ui/Button";

interface SignupVerifyStepProps {
  busy: boolean;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export default function SignupVerifyStep({ busy, onVerify, onResend }: SignupVerifyStepProps) {
  const [otp, setOtp] = useState("");
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Restore active cooldown from sessionStorage across page reloads
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("intake_signup_otp_cooldown");
      if (saved) {
        const endTime = parseInt(saved, 10);
        if (endTime > Date.now()) {
          setCooldownEnd(endTime);
        } else {
          sessionStorage.removeItem("intake_signup_otp_cooldown");
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!cooldownEnd) {
      setSecondsRemaining(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setCooldownEnd(null);
        try {
          sessionStorage.removeItem("intake_signup_otp_cooldown");
        } catch {
          // ignore
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  async function handleResend() {
    if (secondsRemaining > 0 || busy) return;
    const end = Date.now() + 60 * 1000;
    setCooldownEnd(end);
    setSecondsRemaining(60);
    try {
      sessionStorage.setItem("intake_signup_otp_cooldown", end.toString());
    } catch {
      // ignore
    }
    await onResend();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onVerify(otp);
  }

  const isCoolingDown = secondsRemaining > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-5">
      <OtpField value={otp} onChange={setOtp} disabled={busy} />

      <Button type="submit" loading={busy} disabled={otp.length !== OTP_LENGTH} className="w-full">
        Verify Email
      </Button>

      <div className="flex items-center justify-center text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={busy || isCoolingDown}
          className={`font-semibold transition-colors ${
            isCoolingDown || busy
              ? "text-text-secondary dark:text-dark-text-secondary cursor-not-allowed opacity-70"
              : "text-accent hover:underline dark:text-accent-dark cursor-pointer"
          }`}
        >
          {isCoolingDown ? `Resend code in ${secondsRemaining}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
