"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "./ui/Spinner";
import ErrorState from "./ui/ErrorState";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Pages that run before or during onboarding set this, so a user who has not
   * entered their body profile yet is not bounced straight back to it.
   */
  allowIncompleteOnboarding?: boolean;
}

export default function ProtectedRoute({
  children,
  allowIncompleteOnboarding = false,
}: ProtectedRouteProps) {
  const { user, loading, sessionError, retrySession } = useAuth();
  const router = useRouter();
  const needsOnboarding = Boolean(user && !user.onboardingCompleted && !allowIncompleteOnboarding);

  useEffect(() => {
    if (loading) return;
    // An unconfirmed session is not a signed-out one: the retry screen below handles it.
    if (!user && sessionError) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [user, loading, sessionError, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app dark:bg-dark-bg-app">
        <Spinner size="lg" className="text-accent dark:text-accent-dark" />
      </div>
    );
  }

  if (!user && sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app dark:bg-dark-bg-app px-4 sm:px-8">
        <div className="w-full max-w-lg">
          <ErrorState message={sessionError} onRetry={retrySession} />
        </div>
      </div>
    );
  }

  if (!user || needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}
