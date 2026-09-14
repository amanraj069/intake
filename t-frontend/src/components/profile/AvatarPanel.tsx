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
    <section className="space-y-4 sm:space-y-6">
      <h2 className="border-b border-black/10 pb-2.5 sm:pb-4 text-xs font-bold   text-text-secondary dark:border-white/10 dark:text-dark-text-secondary">
        Profile Picture
      </h2>

      <div className="flex items-center gap-5 sm:gap-8">
        <Avatar
          src={user.avatarUrl}
          initials={initials(user)}
          size="lg"
          className="rounded-full shrink-0 border-2 border-border/60 dark:border-dark-border/60 shadow-xs ring-2 ring-black/5 dark:ring-white/5"
        />

        <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
          <div>
            <p className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text truncate">
              {displayName(user)}
            </p>
            <p className="text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary leading-snug">
              JPEG, PNG, or WebP. Up to 5MB.
            </p>
          </div>

          <div className="flex flex-row items-center gap-2.5 sm:gap-3">
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
              className="!px-3.5 !py-1.5 h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 shadow-xs"
            >
              {pending !== "upload" && <CameraIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              {user.avatarUrl ? "Replace" : "Upload"}
            </Button>

            {user.avatarUrl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={remove}
                loading={pending === "remove"}
                disabled={pending !== null}
                className="!px-3 !py-1.5 h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 !text-red-600 dark:!text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 shadow-2xs"
              >
                {pending !== "remove" && (
                  <TrashIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span className="text-red-600 dark:text-red-400">Remove</span>
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs sm:text-sm font-medium text-error dark:text-error-dark">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
