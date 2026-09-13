"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import MealsBrowser from "@/components/meals/MealsBrowser";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { DocumentIcon } from "@/components/icons";

export default function MealsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
                  <PageHeader
            title="Meals"
            description="Everything you have logged, filtered by date and meal type."
            showBackButton
            action={
              <div className="flex gap-2">
                <Link href="/meals/import">
                  <Button variant="secondary" className="gap-2">
                    <DocumentIcon className="h-4 w-4" />
                    Import PDF
                  </Button>
                </Link>
                <Link href="/log-meal">
                  <Button>Log Meal</Button>
                </Link>
              </div>
            }
          />
          <MealsBrowser />
        
      </DashboardLayout>
    </ProtectedRoute>
  );
}
