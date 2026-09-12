"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

/**
 * Prompts an unverified account to finish email verification. Rendered only
 * while `emailVerified` is false, so it disappears on the next refresh.
 */
export default function VerificationBanner() {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  async function resendLink() {
    setSending(true);
    try {
      const response = await api.resendVerification();
      toast.success(response.message);
    } catch (cause) {
      toast.error(toErrorMessage(cause, "Could not send the verification email."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border border-black p-5 dark:border-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold   text-text-primary dark:text-dark-text">
          Action Required
        </p>
        <p className="mt-2 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
          Your email is unverified. Check your inbox, or request a new link.
        </p>
      </div>

      <Button variant="secondary" size="sm" onClick={resendLink} loading={sending}>
        Resend Link
      </Button>
    </div>
  );
}
