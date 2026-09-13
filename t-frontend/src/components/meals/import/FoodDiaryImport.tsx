"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirmImport } from "@/hooks/useConfirmImport";
import { useFoodDiaryPreview } from "@/hooks/useFoodDiaryPreview";
import type { FoodEntryInput } from "@/types/nutrition";
import ImportFailureNotice from "./ImportFailureNotice";
import ImportProgress from "./ImportProgress";
import ImportReviewTable from "./ImportReviewTable";
import ImportSummary from "./ImportSummary";
import PdfDropzone from "./PdfDropzone";

/**
 * Takes a diary PDF through choose, parse, review and import. Parsing saves
 * nothing: rows are only written when the user confirms the reviewed table.
 */
export default function FoodDiaryImport() {
  const [file, setFile] = useState<File | null>(null);
  // A fresh key per parse gives the review table fresh row state for every new preview.
  const [parseCount, setParseCount] = useState(0);
  const [submittedRowNumbers, setSubmittedRowNumbers] = useState<number[]>([]);
  const preview = useFoodDiaryPreview();
  const confirmation = useConfirmImport();
  const toast = useToast();

  function startOver() {
    preview.reset();
    confirmation.reset();
    setFile(null);
  }

  function chooseFile(chosen: File) {
    preview.reset();
    confirmation.reset();
    setFile(chosen);
  }

  function parseFile() {
    if (!file) return;
    setParseCount((count) => count + 1);
    preview.parse(file);
  }

  async function confirmImport(entries: FoodEntryInput[], rowNumbers: number[]) {
    setSubmittedRowNumbers(rowNumbers);
    const result = await confirmation.confirm(entries);
    if (result) toast.success(`Imported ${result.importedCount} of ${entries.length} entries.`);
  }

  if (confirmation.result) {
    return <ImportSummary result={confirmation.result} rowNumbers={submittedRowNumbers} onImportAnother={startOver} />;
  }

  if (preview.status === "parsing" && file) {
    return <ImportProgress fileName={file.name} onCancel={preview.reset} />;
  }

  if (preview.status === "failed" && preview.failure) {
    return (
      <ImportFailureNotice
        fileName={file?.name ?? null}
        failure={preview.failure}
        onRetry={parseFile}
        onChooseAnother={startOver}
      />
    );
  }

  if (preview.status === "done" && preview.preview && file) {
    return (
      <ImportReviewTable
        key={parseCount}
        preview={preview.preview}
        fileName={file.name}
        submitting={confirmation.submitting}
        error={confirmation.error}
        onConfirm={confirmImport}
        onStartOver={startOver}
      />
    );
  }

  return <PdfDropzone file={file} onFileChosen={chooseFile} onParse={parseFile} />;
}
