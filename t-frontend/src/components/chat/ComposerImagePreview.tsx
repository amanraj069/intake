"use client";

import { CloseIcon } from "@/components/icons";

interface ComposerImagePreviewProps {
  file: File;
  previewUrl: string;
  onRemove: () => void;
}

/** The food photo waiting to be sent, shown as a tile above the message field. */
export default function ComposerImagePreview({ file, previewUrl, onRemove }: ComposerImagePreviewProps) {
  return (
    <div className="px-2 pt-2">
      <div className="group relative inline-flex items-center gap-3 rounded-2xl border border-border dark:border-dark-border bg-bg-app/70 dark:bg-dark-bg-app/70 p-1.5 pr-4">
        <img src={previewUrl} alt="Attached food photo" className="h-14 w-14 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="max-w-[12rem] truncate text-xs font-semibold text-text-primary dark:text-dark-text">{file.name}</p>
          <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">Photo ready to analyse</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove image"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card text-text-secondary dark:text-dark-text-secondary shadow-sm transition-all duration-150 hover:scale-105 hover:text-text-primary dark:hover:text-dark-text cursor-pointer"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
