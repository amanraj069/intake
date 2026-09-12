"use client";

import { useCallback, useState, type FormEvent } from "react";
import { toErrorMessage } from "@/lib/errorMessage";
import { useToast } from "@/components/ui/Toast";

export type OtpStage = "request" | "verify";

interface OtpFlowOptions {
  /** Asks the backend to mail a code; resolves with the address it went to. */
  sendCode: () => Promise<string>;
  /** Redeems the code, committing the change it was guarding. */
  verifyCode: (otp: string) => Promise<void>;
  /** The caller's own cleanup once the change has been committed. */
  onVerified: () => void | Promise<void>;
  /** Shown when a failure carries no message of its own. */
  errorFallback: string;
}

export interface OtpFlow {
  stage: OtpStage;
  /** The address the pending code went to, once one is in flight. */
  sentTo: string | null;
  otp: string;
  setOtp: (value: string) => void;
  busy: boolean;
  error: string | null;
  /** Advances the flow: sends a code, or redeems the one on screen. */
  submit: (event: FormEvent) => Promise<void>;
  /** Abandons a pending code and returns the form to its first step. */
  cancel: () => void;
}

/**
 * The two-step "send a code, then redeem it" exchange shared by the email and
 * password changes. Both steps hit the same pair of endpoints and fail the same
 * way; only the payloads differ, and those are the caller's callbacks.
 */
export function useOtpFlow({
  sendCode,
  verifyCode,
  onVerified,
  errorFallback,
}: OtpFlowOptions): OtpFlow {
  const toast = useToast();
  const [stage, setStage] = useState<OtpStage>("request");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(() => {
    setStage("request");
    setSentTo(null);
    setOtp("");
    setError(null);
  }, []);

  const runStep = useCallback(
    async (step: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await step();
      } catch (cause) {
        const message = toErrorMessage(cause, errorFallback);
        setError(message);
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [errorFallback, toast]
  );

  const requestStep = useCallback(
    () =>
      runStep(async () => {
        const destination = await sendCode();
        setSentTo(destination);
        setStage("verify");
        toast.success(`Verification code sent to ${destination}.`);
      }),
    [runStep, sendCode, toast]
  );

  const verifyStep = useCallback(
    () =>
      runStep(async () => {
        await verifyCode(otp);
        cancel();
        await onVerified();
      }),
    [runStep, verifyCode, otp, cancel, onVerified]
  );

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      await (stage === "request" ? requestStep() : verifyStep());
    },
    [stage, requestStep, verifyStep]
  );

  return { stage, sentTo, otp, setOtp, busy, error, submit, cancel };
}
