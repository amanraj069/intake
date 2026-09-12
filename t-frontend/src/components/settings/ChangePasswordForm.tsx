"use client";

import { useCallback, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useOtpFlow } from "@/hooks/useOtpFlow";
import { useToast } from "@/components/ui/Toast";
import { MIN_PASSWORD_LENGTH, passwordChangeError } from "@/lib/validation/passwordChange";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormError from "@/components/ui/FormError";
import SettingsBlock from "./SettingsBlock";
import OtpVerifyStep from "./OtpVerifyStep";

interface ChangePasswordFormProps {
  currentEmail: string;
}

/**
 * Sets a new password without asking for the old one: the code mailed to the
 * address on file is the proof of identity instead, which is what lets someone
 * who is signed in but has forgotten their password still rotate it.
 */
export default function ChangePasswordForm({ currentEmail }: ChangePasswordFormProps) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const sendCode = useCallback(async () => {
    const response = await api.requestPasswordChangeOtp();
    return response.data?.sentTo ?? currentEmail;
  }, [currentEmail]);

  const verifyCode = useCallback(
    async (otp: string) => {
      await api.confirmPasswordChange(otp, newPassword);
    },
    [newPassword]
  );

  const onVerified = useCallback(() => {
    setNewPassword("");
    setConfirmation("");
    toast.success("Password updated.");
  }, [toast]);

  const flow = useOtpFlow({
    sendCode,
    verifyCode,
    onVerified,
    errorFallback: "Could not update your password. Please try again.",
  });

  function handleSubmit(event: FormEvent) {
    const invalid = flow.stage === "request" ? passwordChangeError(newPassword, confirmation) : null;
    if (invalid) {
      event.preventDefault();
      setLocalError(invalid);
      return;
    }

    setLocalError(null);
    void flow.submit(event);
  }

  const error = localError ?? flow.error;

  return (
    <SettingsBlock
      title="Change Password"
      description={`Choose a new password, then confirm it with the 6-digit code we send to ${currentEmail}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {flow.stage === "request" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={flow.busy}
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the new password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={flow.busy}
                required
              />
            </div>

            <Button type="submit" loading={flow.busy} className="w-full sm:w-auto">
              Send Code
            </Button>
          </>
        ) : (
          <OtpVerifyStep flow={flow} confirmLabel="Update Password" />
        )}

        {error && <FormError message={error} />}
      </form>
    </SettingsBlock>
  );
}
