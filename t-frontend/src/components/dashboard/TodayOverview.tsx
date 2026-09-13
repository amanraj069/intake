"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import { greetingForHour, toTodayStatusLine } from "@/lib/dashboardCopy";
import { firstNameOrFallback } from "@/lib/userIdentity";
import TodayPanel from "./TodayPanel";

/** The date line above the greeting, e.g. "SATURDAY, 12 SEPTEMBER". */
function formatGreetingDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function toGreeting(name: string | null): string {
  const greeting = greetingForHour(new Date().getHours());
  return name ? `${greeting}, ${name}` : greeting;
}

/**
 * Today's intake, from the greeting down to the macro strip. The greeting and
 * the panel read from one request, so the header's status line and the figures
 * beneath it can never disagree.
 */
export default function TodayOverview() {
  const { user } = useAuth();
  const { summary, loading, loadError, reload } = useDailyIntake();

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={formatGreetingDate(new Date())}
        title={toGreeting(user ? firstNameOrFallback(user) : null)}
        description={toTodayStatusLine(loading ? null : summary)}
        action={
          <Link href="/log-meal">
            <Button>Log Meal</Button>
          </Link>
        }
      />

      {loading && (
        <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-8">
          <SkeletonRows count={4} />
        </div>
      )}

      {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}
      {!loading && !loadError && summary && <TodayPanel summary={summary} />}
    </section>
  );
}
