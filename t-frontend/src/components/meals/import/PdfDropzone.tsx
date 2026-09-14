"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Button from "@/components/ui/Button";
import { DocumentIcon, ParseIcon } from "@/components/icons";
import { PDF_FILE_ACCEPT, formatFileSize } from "@/lib/foodDiaryPdfFile";

interface PdfDropzoneProps {
  file: File | null;
  onFileChosen: (file: File) => void;
  onParse: () => void;
}

/** Pick or drop a diary PDF, then start parsing it. Choosing a file never parses it by itself. */
export default function PdfDropzone({ file, onFileChosen, onParse }: PdfDropzoneProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFileChosen(dropped);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset first so choosing the same file again still fires a change event.
    event.target.value = "";
    if (chosen) onFileChosen(chosen);
  }

  const chooseFile = () => fileInput.current?.click();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border border-dashed py-10 px-6 sm:py-16 sm:px-10 min-h-[320px] sm:min-h-[400px] lg:min-h-[430px] flex flex-col items-center justify-center transition-colors duration-150 ${
        dragging
          ? "border-accent bg-accent/10 dark:border-accent-dark dark:bg-accent-dark/20"
          : "border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card"
      }`}
    >
      <input ref={fileInput} type="file" accept={PDF_FILE_ACCEPT} onChange={handleFileInput} className="hidden" />

      <div className="flex flex-col items-center text-center gap-5 sm:gap-6">
        <DocumentIcon
          className="h-12 w-12 sm:h-16 sm:w-16 text-text-secondary dark:text-dark-text-secondary"
          strokeWidth={1.5}
        />

        {file ? (
          <div className="min-w-0 max-w-full space-y-2.5 sm:space-y-3">
            <p className="truncate text-base sm:text-lg font-bold text-text-primary dark:text-dark-text">{file.name}</p>
            <p className="text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              {formatFileSize(file.size)}. Parse it to review the entries before anything is saved.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            <p className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text">
              Drop a food diary PDF here
            </p>
            <p className="max-w-md text-xs sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary leading-relaxed mx-auto">
              A diary exported as a text PDF, up to 5MB and 10 pages. You review every row before it is imported.
            </p>
          </div>
        )}

        <div className="mt-3 sm:mt-5 flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row items-center">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold border border-border dark:border-dark-border shadow-2xs hover:shadow-xs"
            onClick={chooseFile}
          >
            {file ? "Choose another PDF" : "Choose PDF"}
          </Button>
          {file && (
            <Button
              type="button"
              size="md"
              className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold border border-black/10 dark:border-white/20 shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2"
              onClick={onParse}
            >
              <span>Parse</span>
              <ParseIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
