"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { formatLongDate } from "@/lib/formatDate";
import { displayName } from "@/lib/userIdentity";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import FormSection from "@/components/ui/FormSection";
import DataPair from "@/components/ui/DataPair";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AvatarPanel from "@/components/profile/AvatarPanel";
import VerificationBanner from "@/components/profile/VerificationBanner";
import BodyProfilePanel from "@/components/profile/BodyProfilePanel";

const PROVIDER_LABELS = {
  google: "Google",
  local: "Email & Password",
} as const;

/**
 * Who the account is: its picture and its details, read-only. Everything that
 * changes a credential lives on /settings instead, so this page never asks for
 * a password and the settings page never shows profile presentation.
 */
function ProfileContent() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
              <PageHeader
          title="Profile"
          description="Your picture and account details."
          showBackButton
        />

        {!user.emailVerified && <VerificationBanner />}

        <AvatarPanel user={user} />

        <FormSection title="Account Details">
          <div className="grid gap-8 sm:grid-cols-2">
            <DataPair label="Name" value={displayName(user)} />
            <DataPair
              label="Email"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  {user.email}
                  <Badge variant={user.emailVerified ? "success" : "warning"}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </span>
              }
            />
            <DataPair label="Auth Provider" value={PROVIDER_LABELS[user.authProvider]} />
            <DataPair label="Member Since" value={formatLongDate(user.createdAt)} />
          </div>
        </FormSection>

        <BodyProfilePanel profile={user.bodyProfile} />

        <FormSection
          title="Sign-in & Security"
          description="Changing the email you sign in with, or setting a new password, happens in settings."
        >
          <Link href="/settings">
            <Button variant="secondary" size="sm">
              Open Settings
            </Button>
          </Link>
        </FormSection>

        <div className="flex justify-end border-t border-black/10 pt-12 dark:border-white/10">
          <Button variant="secondary" size="lg" onClick={logout}>
            Sign Out
          </Button>
        </div>
      
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
