import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { AppError } from '../middleware/errorHandler';
import { getValidatedInput } from '../middleware/validate';
import { confirmFoodEntryImportSchema } from '../schemas/foodEntryImport.schema';
import * as foodDiaryPreviewService from '../services/foodDiaryPreview.service';
import * as foodEntryImportService from '../services/foodEntryImport.service';

/**
 * POST /api/food-entries/import/preview
 * Accepts a multipart `file` (food diary PDF) and returns parsed rows for
 * review, each flagged with any issues. Saves nothing.
 */
export async function previewFoodEntryImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('Choose a PDF to import', 400, 'PDF_REQUIRED');
    }

    const preview = await foodDiaryPreviewService.previewFoodDiaryImport(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'Diary read. Review the rows before importing.',
      data: preview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/food-entries/import/confirm
 * Saves reviewed rows for the current user, skipping invalid rows and exact duplicates.
 */
export async function confirmFoodEntryImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, confirmFoodEntryImportSchema);
    const result = await foodEntryImportService.confirmFoodEntryImport(userId, body.entries);

    res.status(200).json({
      success: true,
      message: `Imported ${result.importedCount} of ${body.entries.length} entries`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
