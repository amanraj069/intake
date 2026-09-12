"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { avatarFileError } from "@/lib/avatarFile";
import { toErrorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

type AvatarAction = "upload" | "remove" | null;

export interface AvatarController {
  pending: AvatarAction;
  error: string | null;
  upload: (file: File) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Drives profile picture changes: validates the file, calls the API, and
 * refreshes the session user so the sidebar avatar updates with the page.
 */
export function useAvatar(): AvatarController {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<AvatarAction>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: Exclude<AvatarAction, null>, call: () => Promise<unknown>, success: string) => {
      setPending(action);
      setError(null);
      try {
        await call();
        await refreshUser();
        toast.success(success);
      } catch (cause) {
        const message = toErrorMessage(cause, "Could not update your profile picture.");
        setError(message);
        toast.error(message);
      } finally {
        setPending(null);
      }
    },
    [refreshUser, toast]
  );

  const upload = useCallback(
    async (file: File) => {
      const invalid = avatarFileError(file);
      if (invalid) {
        setError(invalid);
        toast.error(invalid);
        return;
      }

      await run("upload", () => api.uploadAvatar(file), "Profile picture updated.");
    },
    [run, toast]
  );

  const remove = useCallback(
    () => run("remove", () => api.removeAvatar(), "Profile picture removed."),
    [run]
  );

  return { pending, error, upload, remove };
}
