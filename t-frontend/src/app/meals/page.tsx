"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import MealsBrowser from "@/components/meals/MealsBrowser";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { DocumentIcon, LogMealIcon } from "@/components/icons";

export default function MealsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-3 sm:space-y-6">
          <PageHeader
            title="Meals"
            description="Everything you have logged, filtered by date and meal type."
            hideDescriptionOnMobile
            showBackButton
            action={
              <div className="flex items-center gap-2">
                <Link href="/meals/import">
                  <Button
                    variant="secondary"
                    className="h-9 px-2.5 text-xs sm:h-auto sm:px-6 sm:py-3 sm:text-sm gap-1.5 sm:gap-2 font-semibold"
                    title="Import PDF"
                  >
                    <DocumentIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span>
                      Import<span className="hidden sm:inline"> PDF</span>
                    </span>
                  </Button>
                </Link>
                <Link href="/log-meal">
                  <Button
                    className="h-9 w-9 sm:w-auto sm:h-auto px-0 sm:px-6 sm:py-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
                    title="Log Meal"
                    aria-label="Log Meal"
                  >
                    <LogMealIcon className="h-4 w-4 shrink-0 sm:hidden" />
                    <span className="hidden sm:inline">Log Meal</span>
                  </Button>
                </Link>
              </div>
            }
          />
          <MealsBrowser />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
