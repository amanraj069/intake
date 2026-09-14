"use client";

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
import BodyProfilePanel from "@/components/profile/BodyProfilePanel";
import { GoogleIcon, LogoutIcon } from "@/components/icons";

const PROVIDER_LABELS = {
  google: "Google",
  local: "Email & Password",
} as const;

/**
 * Who the account is: its picture and its details, read-only.
 */
function ProfileContent() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8 sm:space-y-12">
        <PageHeader
          title="Profile"
          description="Your picture and account details."
          showBackButton
          hideDescriptionOnMobile
          alignActionWithTitle
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-8 sm:h-9 !px-2.5 sm:!px-3.5 text-xs sm:text-sm font-semibold rounded-xl !text-red-600 dark:!text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 shrink-0 shadow-2xs"
              onClick={logout}
            >
              <span className="text-red-600 dark:text-red-400">Log Out</span>
              <LogoutIcon className="ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-red-600 dark:text-red-400" />
            </Button>
          }
        />

        <AvatarPanel user={user} />

        <FormSection title="Account Details">
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              <DataPair label="Name" value={displayName(user)} />
              <DataPair
                label="Auth Provider"
                value={
                  <span className="inline-flex items-center gap-1.5 sm:gap-2">
                    {user.authProvider === "google" && (
                      <GoogleIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
                    )}
                    <span>{PROVIDER_LABELS[user.authProvider]}</span>
                  </span>
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-8">
              <DataPair
                label="Email"
                value={
                  <span className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="break-all">{user.email}</span>
                    <Badge variant="success" className="text-[11px] px-2.5 py-0.5">
                      Verified
                    </Badge>
                  </span>
                }
              />
              <DataPair label="Member Since" value={formatLongDate(user.createdAt)} />
            </div>
          </div>
        </FormSection>

        <BodyProfilePanel profile={user.bodyProfile} />
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
