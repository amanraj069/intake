"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingPlan, type OnboardingStage } from "@/hooks/useOnboardingPlan";
import { firstNameOrFallback } from "@/lib/userIdentity";
import { EMPTY_BODY_PROFILE_FORM, profileToFormValues } from "@/lib/validation/bodyProfileForm";
import type { User } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthLayout from "@/components/AuthLayout";
import AuthStepHeader from "@/components/auth/AuthStepHeader";
import BodyProfileForm from "@/components/onboarding/BodyProfileForm";
import PlanReview from "@/components/onboarding/PlanReview";
import { useToast } from "@/components/ui/Toast";

const STAGE_NUMBERS: Record<OnboardingStage, number> = { profile: 1, review: 2 };

function headerCopy(stage: OnboardingStage, user: User): { title: string; description: string } {
  if (stage === "review") {
    return {
      title: "Your daily plan",
      description: "Based on your details. Save it to fill in your goals automatically.",
    };
  }
  if (user.onboardingCompleted) {
    return {
      title: "Update your plan",
      description: "Changed weight or routine? Recalculate your daily targets.",
    };
  }
  return {
    title: `Welcome, ${firstNameOrFallback(user)}`,
    description: "A few details about you, and we will work out your daily calories and macros.",
  };
}

function OnboardingContent() {
  const { user, setSessionUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const onboarding = useOnboardingPlan();

  if (!user) return null;

  async function handleAccept() {
    const updatedUser = await onboarding.acceptPlan();
    if (!updatedUser) return;

    setSessionUser(updatedUser);
    toast.success("Your goals are set.");
    router.replace("/dashboard");
  }

  // A returning user starts from what they entered last time; an unsaved
  // profile from this visit takes precedence when they come back to edit it.
  const savedProfile = onboarding.profile ?? user.bodyProfile;
  const initialValues = savedProfile ? profileToFormValues(savedProfile) : EMPTY_BODY_PROFILE_FORM;
  const { title, description } = headerCopy(onboarding.stage, user);

  return (
    <AuthLayout>
      <div className="space-y-8">
        <AuthStepHeader
          title={title}
          description={description}
          step={{ current: STAGE_NUMBERS[onboarding.stage], total: 2 }}
        />

        {onboarding.stage === "profile" && (
          <BodyProfileForm
            initialValues={initialValues}
            busy={onboarding.generating}
            onSubmit={onboarding.generatePlan}
          />
        )}

        {onboarding.stage === "review" && onboarding.plan && (
          <PlanReview
            plan={onboarding.plan}
            saving={onboarding.saving}
            onEdit={onboarding.editProfile}
            onAccept={handleAccept}
          />
        )}

        {onboarding.error && (
          <p role="alert" className="text-sm font-medium text-error dark:text-error-dark">
            {onboarding.error}
          </p>
        )}

        {user.onboardingCompleted && (
          <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
            <Link href="/dashboard" className="font-semibold text-accent hover:underline dark:text-accent-dark">
              Back to dashboard
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute allowIncompleteOnboarding>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
