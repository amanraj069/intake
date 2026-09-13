"use client";

import { useState, type DragEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { PhotoUploadIcon } from "@/components/icons";

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
      className={`space-y-5 rounded-2xl border border-dashed p-5 sm:p-6 transition-colors duration-150 ${
        dragging
          ? "border-accent bg-accent/5 dark:border-accent-dark dark:bg-accent-dark/10"
          : "border-input-border dark:border-dark-input-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text">
            <PhotoUploadIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-text-primary dark:text-dark-text">Fill from a photo</p>
            <p className="mt-1 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              Snap your plate or a nutrition label. We draft the entry, you review it before saving.
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onChoosePhoto} className="w-full sm:w-auto">
          Upload photo
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
