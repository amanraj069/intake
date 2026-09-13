import { InvalidPDFException, PDFParse, PasswordException } from 'pdf-parse';
import { AppError } from '../middleware/errorHandler';

/** A diary longer than this is almost certainly not one sitting of food logs, and would outgrow one AI call. */
export const MAX_PDF_PAGES = 20;
export const MAX_PDF_TEXT_CHARACTERS = 50_000;
/** Below this, a page is treated as a scan with no text layer rather than a short diary. */
const MIN_TEXT_CHARACTERS = 20;

export interface ExtractedPdfText {
  /** Every page's text, each under a `--- Page n ---` marker so rows can be traced to a page. */
  text: string;
  pageCount: number;
  /** Characters of actual page content, excluding the page markers. */
  contentLength: number;
}

/** The bytes decide the file type, not the client's declared Content-Type. */
function assertPdfSignature(bytes: Buffer): void {
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new AppError('That file is not a readable PDF.', 422, 'PDF_UNREADABLE');
  }
}

function toPdfError(cause: unknown): unknown {
  if (cause instanceof AppError) return cause;

  if (cause instanceof PasswordException) {
    return new AppError('This PDF is password protected. Remove the password and try again.', 422, 'PDF_ENCRYPTED');
  }

  if (cause instanceof InvalidPDFException) {
    return new AppError('This PDF is damaged or incomplete, so it could not be read.', 422, 'PDF_UNREADABLE');
  }

  console.error('[PdfText] Unexpected PDF parsing failure:', cause);
  return new AppError('This PDF could not be read. Try exporting it again.', 422, 'PDF_UNREADABLE');
}

async function readText(bytes: Buffer): Promise<ExtractedPdfText> {
  const parser = new PDFParse({ data: bytes });

  try {
    const info = await parser.getInfo();
    if (info.total > MAX_PDF_PAGES) {
      throw new AppError(
        `This PDF has ${info.total} pages. Import at most ${MAX_PDF_PAGES} pages at a time.`,
        422,
        'PDF_TOO_LONG'
      );
    }

    const result = await parser.getText({ pageJoiner: '' });
    const pages = result.pages.map((page) => ({ num: page.num, text: page.text.trim() }));

    return {
      text: pages.map((page) => `--- Page ${page.num} ---\n${page.text}`).join('\n\n'),
      pageCount: result.total,
      contentLength: pages.reduce((total, page) => total + page.text.length, 0),
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Pulls the text layer out of an uploaded PDF. Rejects, rather than trims, a
 * document that is too long: silently cutting it would drop diary rows.
 *
 * @throws AppError PDF_UNREADABLE, PDF_ENCRYPTED, PDF_TOO_LONG or PDF_NO_TEXT.
 */
export async function extractPdfText(bytes: Buffer): Promise<ExtractedPdfText> {
  assertPdfSignature(bytes);

  let extracted: ExtractedPdfText;
  try {
    extracted = await readText(bytes);
  } catch (cause) {
    throw toPdfError(cause);
  }

  if (extracted.contentLength < MIN_TEXT_CHARACTERS) {
    throw new AppError(
      'No text was found in this PDF. It may be a scan or photo: export the diary as a text PDF, or log the meals from a photo instead.',
      422,
      'PDF_NO_TEXT'
    );
  }

  if (extracted.contentLength > MAX_PDF_TEXT_CHARACTERS) {
    throw new AppError('This PDF has too much text to import at once. Split it into smaller files.', 422, 'PDF_TOO_LONG');
  }

  return extracted;
}
