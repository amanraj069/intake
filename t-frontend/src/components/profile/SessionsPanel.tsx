"use client";

import { useState } from "react";
import { useSignOutOtherDevices } from "@/hooks/useSignOutOtherDevices";
import FormSection from "../ui/FormSection";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";

/** Lets the user end every session except the one in this browser. */
export default function SessionsPanel() {
  const [confirming, setConfirming] = useState(false);
  const { pending, signOutOtherDevices } = useSignOutOtherDevices();

  async function handleConfirm() {
    if (await signOutOtherDevices()) setConfirming(false);
  }

  return (
    <FormSection
      title="Sessions"
      description="Signed in somewhere you no longer use, or don't recognise? End every other session at once."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(true)}
          className="w-full sm:w-auto h-8 sm:h-9 !px-3.5 text-xs sm:text-sm font-semibold rounded-xl shadow-xs !text-red-600 dark:!text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15"
        >
          Sign out other devices
        </Button>
      }
    >
      <ConfirmDialog
        open={confirming}
        title="Sign out other devices"
        description="Every other browser and device signed in to this account is signed out immediately. You stay signed in here."
        confirmLabel="Sign out others"
        working={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </FormSection>
  );
}
