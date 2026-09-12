"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import TodaySummaryCard from "@/components/dashboard/TodaySummaryCard";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="w-full max-w-5xl mx-auto space-y-10 pb-24">
          <PageHeader
            title="Dashboard"
            description="Where today stands against the targets you set."
            action={
              <Link href="/log-meal">
                <Button size="sm">Log Meal</Button>
              </Link>
            }
          />

          <TodaySummaryCard />

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/meals" className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                View All Meals
              </Button>
            </Link>
            <Link href="/goals" className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                Adjust Goals
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
