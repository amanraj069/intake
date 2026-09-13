"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { homeRouteFor } from "@/lib/postAuthRoute";
import { useSignupFlow, type SignupStep } from "@/hooks/useSignupFlow";
import AuthLayout from "@/components/AuthLayout";
import AuthStepHeader from "@/components/auth/AuthStepHeader";
import SignupEmailStep from "@/components/auth/SignupEmailStep";
import SignupDetailsStep from "@/components/auth/SignupDetailsStep";
import SignupVerifyStep from "@/components/auth/SignupVerifyStep";

const STEP_NUMBERS: Record<SignupStep, number> = { email: 1, details: 2, verify: 3 };

function stepCopy(step: SignupStep, email: string): { title: string; description: string } {
  if (step === "email") {
    return { title: "Create account", description: "Start with your email, or continue with Google." };
  }
  if (step === "details") {
    return { title: "Tell us about you", description: "Your name and a password for signing in." };
  }
  return { title: "Check your inbox", description: `Enter the 6-digit code we sent to ${email}.` };
}

export default function SignupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const flow = useSignupFlow();

  // Only a user who arrives already signed in is sent away. Once the flow has
  // created the account the user is signed in too, but still has a code to enter.
  const arrivedSignedIn = !authLoading && user !== null && flow.step === "email";

  useEffect(() => {
    if (arrivedSignedIn && user) router.replace(homeRouteFor(user));
  }, [arrivedSignedIn, user, router]);

  if (authLoading || arrivedSignedIn) return null;

  const { title, description } = stepCopy(flow.step, flow.email);

  return (
    <AuthLayout>
      <div className="space-y-8">
        <AuthStepHeader
          title={title}
          description={description}
          step={{ current: STEP_NUMBERS[flow.step], total: 3 }}
        />

        {flow.step === "email" && (
          <SignupEmailStep
            initialEmail={flow.email}
            busy={flow.busy}
            emailTaken={flow.emailTaken}
            onSubmit={flow.submitEmail}
          />
        )}

        {flow.step === "details" && (
          <SignupDetailsStep
            email={flow.email}
            busy={flow.busy}
            serverFieldErrors={flow.serverFieldErrors}
            onEditEmail={flow.editEmail}
            onSubmit={flow.submitDetails}
          />
        )}

        {flow.step === "verify" && (
          <SignupVerifyStep
            busy={flow.busy}
            onVerify={flow.verifyCode}
            onResend={flow.resendCode}
            onSkip={flow.skipVerification}
          />
        )}
      </div>
    </AuthLayout>
  );
}
