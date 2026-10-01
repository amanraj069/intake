"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import { useToast } from "@/components/ui/Toast";

export interface SignOutOtherDevicesController {
  pending: boolean;
  signOutOtherDevices: () => Promise<boolean>;
}

/** Ends every other session of the account. Resolves true on success so a dialog can close. */
export function useSignOutOtherDevices(): SignOutOtherDevicesController {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const signOutOtherDevices = useCallback(async () => {
    setPending(true);
    try {
      await api.logoutOtherDevices();
      toast.success("Signed out of all other devices.");
      return true;
    } catch (cause) {
      toast.error(toErrorMessage(cause, "Could not sign out your other devices."));
      return false;
    } finally {
      setPending(false);
    }
  }, [toast]);

  return { pending, signOutOtherDevices };
}
