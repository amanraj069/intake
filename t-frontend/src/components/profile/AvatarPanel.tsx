"use client";

import { useRef, type ChangeEvent } from "react";
import { useAvatar } from "@/hooks/useAvatar";
import { ACCEPTED_AVATAR_TYPES } from "@/lib/avatarFile";
import { displayName, initials } from "@/lib/userIdentity";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { CameraIcon, TrashIcon } from "../icons";
import type { User } from "@/lib/api";

/** Profile picture display plus its upload and remove controls. */
export default function AvatarPanel({ user }: { user: User }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { pending, error, upload, remove } = useAvatar();

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset first so re-picking the same file still fires a change event.
    event.target.value = "";
    if (file) upload(file);
  }

  return (
    <section className="space-y-6">
      <h2 className="border-b border-black/10 pb-4 text-xs font-bold   text-text-secondary dark:border-white/10 dark:text-dark-text-secondary">
        Profile Picture
      </h2>

      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar src={user.avatarUrl} initials={initials(user)} size="lg" />

        <div className="flex-1 space-y-4">
          <div>
            <p className="text-lg font-medium text-text-primary dark:text-dark-text">
              {displayName(user)}
            </p>
            <p className="mt-1 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              JPEG, PNG, or WebP. Up to 5MB. Without a picture your initials are shown.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(",")}
              onChange={handleFileChosen}
              className="hidden"
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
              loading={pending === "upload"}
              disabled={pending !== null}
            >
              {pending !== "upload" && <CameraIcon className="mr-2 h-4 w-4" />}
              {user.avatarUrl ? "Replace" : "Upload"}
            </Button>

            {user.avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                loading={pending === "remove"}
                disabled={pending !== null}
              >
                {pending !== "remove" && <TrashIcon className="mr-2 h-4 w-4" />}
                Remove
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-error dark:text-error-dark">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
