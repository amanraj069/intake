"use client";

import Input from "@/components/ui/Input";

export const OTP_LENGTH = 6;

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** The six-digit code input: digits only, spaced so it reads as a code. */
export default function OtpField({ value, onChange, disabled = false }: OtpFieldProps) {
  return (
    <Input
      label="Verification code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={OTP_LENGTH}
      placeholder="000000"
      value={value}
      onChange={(event) =>
        onChange(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
      }
      disabled={disabled}
      required
      className="text-center font-mono text-base "
    />
  );
}
