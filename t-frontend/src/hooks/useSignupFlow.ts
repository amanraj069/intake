"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import { toFieldErrors } from "@/lib/apiFieldErrors";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type { SignupDetailsValues } from "@/lib/validation/signupForm";

export type SignupStep = "email" | "details" | "verify";

export interface SignupFlow {
  step: SignupStep;
  email: string;
  firstName: string;
  lastName: string;
  busy: boolean;
  /** Set when step one finds the address already registered. */
  emailTaken: boolean;
  /** Field messages the server returned for the details step. */
  serverFieldErrors: Record<string, string>;
  submitStep1: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
  submitEmail: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
  submitDetails: (details: { password: string; confirmPassword: string; firstName?: string; lastName?: string }) => Promise<void>;
  verifyCode: (otp: string) => Promise<void>;
  resendCode: () => Promise<void>;
  editEmail: () => void;
}

/**
 * Local signup as three screens: claim an email & name, choose password
 * (which creates the account and mails a code), then redeem that code. Every
 * finished path leads to onboarding, which a brand-new account always needs.
 */
export function useSignupFlow(): SignupFlow {
  const { signup, setSessionUser } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const runStep = useCallback(
    async (step: () => Promise<void>, fallback: string) => {
      setBusy(true);
      try {
        await step();
      } catch (cause) {
        setServerFieldErrors(toFieldErrors(cause));
        toast.error(toErrorMessage(cause, fallback));
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const submitStep1 = useCallback(
    (data: { firstName: string; lastName: string; email: string }) =>
      runStep(async () => {
        const normalised = data.email.trim().toLowerCase();
        const response = await api.checkEmail(normalised);
        const available = response.data?.available ?? false;

        setFirstName(data.firstName.trim());
        setLastName(data.lastName.trim());
        setEmail(normalised);
        setEmailTaken(!available);
        if (available) setStep("details");
      }, "Could not check that email. Please try again."),
    [runStep]
  );

  const submitDetails = useCallback(
    (details: { password: string; confirmPassword: string; firstName?: string; lastName?: string }) =>
      runStep(async () => {
        setServerFieldErrors({});
        const fn = details.firstName?.trim() || firstName;
        const ln = details.lastName?.trim() || lastName;
        const { verificationCodeSent } = await signup({
          email,
          firstName: fn,
          lastName: ln,
          password: details.password,
        });

        setStep("verify");
        if (verificationCodeSent) {
          toast.success(`We sent a 6-digit code to ${email}.`);
        } else {
          toast.error("Your account is ready, but the code email failed. Try resending it.");
        }
      }, "Could not create your account. Please try again."),
    [runStep, signup, email, firstName, lastName, toast]
  );

  const verifyCode = useCallback(
    (otp: string) =>
      runStep(async () => {
        const response = await api.confirmSignupOtp(otp);
        if (response.data?.user) setSessionUser(response.data.user);
        try {
          sessionStorage.removeItem("intake_signup_otp_cooldown");
        } catch {
          // ignore
        }
        toast.success("Email verified. Let's set up your goals.");
        router.replace("/onboarding");
      }, "Could not verify that code. Please try again."),
    [runStep, setSessionUser, toast, router]
  );

  const resendCode = useCallback(
    () =>
      runStep(async () => {
        const response = await api.resendSignupOtp();
        toast.success(`A new code is on its way to ${response.data?.sentTo ?? email}.`);
      }, "Could not resend the code. Please try again."),
    [runStep, toast, email]
  );

  const editEmail = useCallback(() => {
    setEmailTaken(false);
    setServerFieldErrors({});
    setStep("email");
  }, []);

  return {
    step,
    email,
    firstName,
    lastName,
    busy,
    emailTaken,
    serverFieldErrors,
    submitStep1,
    submitEmail: submitStep1,
    submitDetails,
    verifyCode,
    resendCode,
    editEmail,
  };
}
