"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import MealsBrowser from "@/components/meals/MealsBrowser";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";

export default function MealsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="w-full max-w-5xl mx-auto space-y-10 pb-24">
          <PageHeader
            title="Meals"
            description="Everything you have logged, filtered by date and meal type."
            showBackButton
            action={
              <Link href="/log-meal">
                <Button>Log Meal</Button>
              </Link>
            }
          />
          <MealsBrowser />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
