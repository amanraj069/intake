"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import SettingsSectionNav from "@/components/settings/SettingsSectionNav";
import SecuritySettings from "@/components/settings/SecuritySettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import type { SettingsSectionId } from "@/components/settings/sections";

function SettingsContent() {
  const { user } = useAuth();
  const [section, setSection] = useState<SettingsSectionId>("security");

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-10 pb-24">
        <PageHeader
          title="Settings"
          description="Manage how you sign in to Intake and how it looks."
          showBackButton
        />

        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <SettingsSectionNav active={section} onSelect={setSection} />

          <div className="min-w-0">
            {section === "security" ? <SecuritySettings user={user} /> : <AppearanceSettings />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
