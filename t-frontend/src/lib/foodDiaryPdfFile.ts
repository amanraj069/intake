/** Mirrors the server's diary upload limit, so a bad file fails before the round trip. */
export const MAX_FOOD_DIARY_PDF_BYTES = 5 * 1024 * 1024;

export const PDF_FILE_ACCEPT = "application/pdf,.pdf";

export function foodDiaryPdfFileError(file: File): string | null {
  // Some systems report an empty type for PDFs dragged in from other apps, so the extension counts too.
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (!isPdf) return "Choose a PDF file.";
  if (file.size > MAX_FOOD_DIARY_PDF_BYTES) return "The PDF must be 5MB or smaller.";

  return null;
}

/** The server checks the declared type, so an untyped PDF is re-labelled before upload. */
export function asPdfUpload(file: File): File {
  return file.type === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
