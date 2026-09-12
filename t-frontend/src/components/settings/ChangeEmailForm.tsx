"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useOtpFlow } from "@/hooks/useOtpFlow";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormError from "@/components/ui/FormError";
import SettingsBlock from "./SettingsBlock";
import OtpVerifyStep from "./OtpVerifyStep";

interface ChangeEmailFormProps {
  currentEmail: string;
}

/**
 * Swaps the sign-in address. The code goes to the proposed address rather than
 * the current one, so entering it is what proves the user owns the inbox they
 * are moving to; nothing changes until that code comes back.
 */
export default function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [newEmail, setNewEmail] = useState("");

  const sendCode = useCallback(async () => {
    const response = await api.requestEmailChangeOtp(newEmail);
    return response.data?.sentTo ?? newEmail;
  }, [newEmail]);

  const verifyCode = useCallback(async (otp: string) => {
    await api.confirmEmailChange(otp);
  }, []);

  const onVerified = useCallback(async () => {
    setNewEmail("");
    await refreshUser();
    toast.success("Email address updated.");
  }, [refreshUser, toast]);

  const flow = useOtpFlow({
    sendCode,
    verifyCode,
    onVerified,
    errorFallback: "Could not update your email address. Please try again.",
  });

  return (
    <SettingsBlock
      title="Email Address"
      description={`You currently sign in as ${currentEmail}. A 6-digit code is sent to the new address to confirm you own it.`}
    >
      <form onSubmit={flow.submit} className="space-y-5" noValidate>
        {flow.stage === "request" ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="New email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                disabled={flow.busy}
                required
              />
            </div>
            <Button type="submit" loading={flow.busy} className="sm:h-[46px]">
              Send Code
            </Button>
          </div>
        ) : (
          <OtpVerifyStep flow={flow} confirmLabel="Change Email" />
        )}

        {flow.error && <FormError message={flow.error} />}
      </form>
    </SettingsBlock>
  );
}
