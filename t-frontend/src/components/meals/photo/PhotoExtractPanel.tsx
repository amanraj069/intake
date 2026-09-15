"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useNutritionExtraction } from "@/hooks/useNutritionExtraction";
import { ACCEPTED_FOOD_IMAGE_TYPES } from "@/lib/foodImageFile";
import type { ExtractionAnalysis, NutritionExtraction } from "@/types/nutrition";
import ExtractionFailureNotice from "./ExtractionFailureNotice";
import ExtractionProgress from "./ExtractionProgress";
import ExtractionSummary from "./ExtractionSummary";
import PhotoDropzone from "./PhotoDropzone";

const FILE_INPUT_ACCEPT = [...ACCEPTED_FOOD_IMAGE_TYPES, ".heic", ".heif"].join(",");

interface PhotoExtractPanelProps {
  /** The analysis of the draft currently in the form, or null when there is none. */
  analysis: ExtractionAnalysis | null;
  disabled: boolean;
  onExtracted: (result: NutritionExtraction, file?: File) => void;
  onDiscard: () => void;
  /** Called when the user gives up on the photo and wants to type the entry instead. */
  onEnterManually: () => void;
}

/**
 * Takes a food photo through upload, analysis and either a filled-in draft or
 * a clear failure. It never saves: the result is handed to the form, where the
 * user reviews and submits it like any manual entry.
 */
export default function PhotoExtractPanel({
  analysis,
  disabled,
  onExtracted,
  onDiscard,
  onEnterManually,
}: PhotoExtractPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const { status, previewUrl, file: currentFile, failure, extract, retry, reset } = useNutritionExtraction();

  async function runExtraction(file: File) {
    const result = await extract(file, description.trim() || undefined);
    if (result) onExtracted(result, file);
  }

  async function handleRetry() {
    const result = await retry();
    if (result) onExtracted(result, currentFile ?? undefined);
  }

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset first so choosing the same file again still fires a change event.
    event.target.value = "";
    if (file) runExtraction(file);
  }

  function handleDiscard() {
    reset();
    onDiscard();
  }

  function handleEnterManually() {
    reset();
    onEnterManually();
  }

  const choosePhoto = () => fileInput.current?.click();

  function renderState() {
    if (status === "analysing") {
      return <ExtractionProgress previewUrl={previewUrl} onCancel={reset} />;
    }

    if (status === "failed" && failure) {
      return (
        <ExtractionFailureNotice
          previewUrl={previewUrl}
          failure={failure}
          onRetry={handleRetry}
          onChooseAnother={choosePhoto}
        />
      );
    }

    if (status === "done" && analysis) {
      return (
        <ExtractionSummary
          previewUrl={previewUrl}
          analysis={analysis}
          onChooseAnother={choosePhoto}
          onDiscard={handleDiscard}
        />
      );
    }

    return (
      <PhotoDropzone
        description={description}
        disabled={disabled}
        onDescriptionChange={setDescription}
        onChoosePhoto={choosePhoto}
        onFileDropped={runExtraction}
      />
    );
  }

  return (
    <section
      aria-label="Fill from a photo"
      className="mt-3 sm:mt-0 rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm px-4 py-5 sm:p-6"
    >
      <input
        ref={fileInput}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        onChange={handleFileChosen}
        className="hidden"
      />
      {renderState()}
    </section>
  );
}
