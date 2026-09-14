"use client";

import { useState, type DragEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CameraIcon, PhotoUploadIcon } from "@/components/icons";

export const MAX_DESCRIPTION_LENGTH = 200;

interface PhotoDropzoneProps {
  description: string;
  disabled: boolean;
  onDescriptionChange: (description: string) => void;
  onChoosePhoto: () => void;
  onFileDropped: (file: File) => void;
}

/** The resting state of the photo panel: pick or drop a photo, with an optional hint about it. */
export default function PhotoDropzone({
  description,
  disabled,
  onDescriptionChange,
  onChoosePhoto,
  onFileDropped,
}: PhotoDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onFileDropped(file);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`space-y-3.5 sm:space-y-5 rounded-2xl border border-dashed p-3.5 sm:p-6 transition-colors duration-150 ${
        dragging
          ? "border-accent bg-accent/5 dark:border-accent-dark dark:bg-accent-dark/10"
          : "border-input-border dark:border-dark-input-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text">
            <PhotoUploadIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-text-primary dark:text-dark-text">Fill from a photo</p>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              Snap your plate or a nutrition label. We draft the entry, you review it before saving.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={onChoosePhoto}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 !bg-white hover:!bg-stone-50 !border-black/10 text-text-primary shadow-xs dark:!bg-white/[0.12] dark:hover:!bg-white/[0.18] dark:!border-white/20 dark:!text-white"
        >
          <CameraIcon className="h-4 w-4 shrink-0 text-text-secondary dark:text-dark-text-secondary" />
          <span>Upload photo</span>
        </Button>
      </div>

      <Input
        id="photo-description"
        label="What is it? (optional)"
        placeholder="e.g. 2 slices of homemade margherita pizza"
        value={description}
        disabled={disabled}
        maxLength={MAX_DESCRIPTION_LENGTH}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
    </div>
  );
}
