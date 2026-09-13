"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Button from "@/components/ui/Button";
import { DocumentIcon } from "@/components/icons";
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
      className={`rounded-2xl border border-dashed p-6 sm:p-10 transition-colors duration-150 ${
        dragging
          ? "border-accent bg-accent/5 dark:border-accent-dark dark:bg-accent-dark/10"
          : "border-input-border dark:border-dark-input-border"
      }`}
    >
      <input ref={fileInput} type="file" accept={PDF_FILE_ACCEPT} onChange={handleFileInput} className="hidden" />

      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text">
          <DocumentIcon className="h-5 w-5" />
        </div>

        {file ? (
          <div className="min-w-0 max-w-full">
            <p className="truncate text-base font-bold text-text-primary dark:text-dark-text">{file.name}</p>
            <p className="mt-1 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              {formatFileSize(file.size)}. Parse it to review the entries before anything is saved.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-base font-bold text-text-primary dark:text-dark-text">Drop a food diary PDF here</p>
            <p className="mt-1 max-w-md text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              A diary exported as a text PDF, up to 10MB and 20 pages. You review every row before it is imported.
            </p>
          </div>
        )}

        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button type="button" variant={file ? "ghost" : "secondary"} size="sm" onClick={chooseFile}>
            {file ? "Choose another PDF" : "Choose PDF"}
          </Button>
          {file && (
            <Button type="button" size="sm" onClick={onParse}>
              Parse
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
