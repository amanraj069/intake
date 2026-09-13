"use client";

import type { User } from "@/lib/api";
import SettingsPanel from "./SettingsPanel";
import SettingsBlock from "./SettingsBlock";
import ChangeEmailForm from "./ChangeEmailForm";
import ChangePasswordForm from "./ChangePasswordForm";

interface SecuritySettingsProps {
  user: User;
}

/** Sign-in credentials: the email on the account, and the password behind it. */
export default function SecuritySettings({ user }: SecuritySettingsProps) {
  // A Google account has no local password, and its address belongs to Google -
  // offering either form here would only produce a rejection from the server.
  if (user.authProvider === "google") {
    return (
      <SettingsPanel title="Security">
        <SettingsBlock
          title="Managed By Google"
          description={`You sign in to Intake with Google as ${user.email}. Your email address and password are changed in your Google account, and take effect here the next time you sign in.`}
        />
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel title="Security">
      <ChangeEmailForm currentEmail={user.email} />
      <ChangePasswordForm currentEmail={user.email} />
    </SettingsPanel>
  );
}
