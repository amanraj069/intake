import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { getValidatedInput } from '../middleware/validate';
import { extractNutritionSchema } from '../schemas/aiExtraction.schema';
import * as aiNutritionExtraction from '../services/aiNutritionExtraction';

/**
 * POST /api/ai/extract-nutrition
 * Accepts a multipart `image` (food photo or nutrition label) and an optional
 * `description`, and returns an editable draft entry. Saves nothing.
 */
export async function extractNutrition(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('Choose a photo to analyse', 400, 'IMAGE_REQUIRED');
    }

    const { body } = getValidatedInput(req, extractNutritionSchema);
    const result = await aiNutritionExtraction.extractNutritionFromImage(
      req.file.buffer,
      body.description
    );

    res.json({
      success: true,
      message: 'Nutrition extracted. Review it before saving.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
