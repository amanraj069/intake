import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { AppError } from '../middleware/errorHandler';
import { getValidatedInput } from '../middleware/validate';
import { confirmFoodEntryImportSchema, foodDiaryImportJobSchema } from '../schemas/foodEntryImport.schema';
import * as foodDiaryImportJobService from '../services/foodDiaryImportJob.service';
import * as foodEntryImportService from '../services/foodEntryImport.service';

/**
 * POST /api/food-entries/import/preview
 * Accepts a multipart `file` (food diary PDF), checks it can be read, and
 * queues the AI parse. Responds 202 with the `jobId` to poll. Saves nothing.
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

    const userId = getAuthenticatedUserId(req);
    const job = await foodDiaryImportJobService.startFoodDiaryImport(userId, req.file.buffer);

    res.status(202).json({
      success: true,
      message: 'Diary queued for reading.',
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food-entries/import/jobs/:jobId
 * Returns a queued import's state and progress, and its preview rows once complete.
 */
export async function getFoodEntryImportJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params } = getValidatedInput(req, foodDiaryImportJobSchema);
    const job = await foodDiaryImportJobService.getFoodDiaryImportJob(userId, params.jobId);

    res.status(200).json({ success: true, message: 'Import status', data: job });
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
