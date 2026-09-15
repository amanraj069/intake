import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { getValidatedInput } from '../middleware/validate';
import {
  createFoodEntrySchema,
  foodEntrySeriesSchema,
  foodEntrySummarySchema,
  listFoodEntriesSchema,
  updateFoodEntrySchema,
} from '../schemas/foodEntry.schema';
import * as dailyIntakeService from '../services/dailyIntake.service';
import * as foodEntryService from '../services/foodEntry.service';
import { uploadMealImage as uploadMealImageToCloudinary } from '../lib/cloudinary';
import { AppError } from '../middleware/errorHandler';

/** Route params for the single-entry endpoints, typed so `id` is a plain string. */
type FoodEntryParams = { id: string };

/**
 * POST /api/food-entries
 * Logs a food entry for the current user.
 */
export async function createFoodEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    // The parsed body, not the raw one: the schema trims text and turns a blank meal name into "no name".
    const { body } = getValidatedInput(req, createFoodEntrySchema);

    if (req.file) {
      const uploaded = await uploadMealImageToCloudinary(req.file.buffer, userId);
      body.imageUrl = uploaded.url;
      body.imagePublicId = uploaded.publicId;
    }

    const foodEntry = await foodEntryService.createFoodEntry(userId, body);

    res.status(201).json({
      success: true,
      message: 'Food entry created successfully',
      data: { foodEntry },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/food-entries/upload-image
 * Uploads a food image to Cloudinary and returns its URL and public ID.
 */
export async function uploadMealImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!req.file) {
      throw new AppError('Choose an image to upload', 400, 'IMAGE_REQUIRED');
    }
    const uploaded = await uploadMealImageToCloudinary(req.file.buffer, userId);
    res.status(200).json({
      success: true,
      message: 'Meal image uploaded successfully',
      data: {
        imageUrl: uploaded.url,
        imagePublicId: uploaded.publicId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/food-entries/:id
 * Updates one of the current user's food entries.
 */
export async function updateFoodEntry(
  req: Request<FoodEntryParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, updateFoodEntrySchema);
    const foodEntry = await foodEntryService.updateFoodEntry(userId, req.params.id, body);

    res.status(200).json({
      success: true,
      message: 'Food entry updated successfully',
      data: { foodEntry },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/food-entries/:id
 * Deletes one of the current user's food entries.
 */
export async function deleteFoodEntry(
  req: Request<FoodEntryParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    await foodEntryService.deleteFoodEntry(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Food entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food-entries
 * One page of the current user's entries, filtered by date range and meal type.
 */
export async function listFoodEntries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, listFoodEntriesSchema);
    const page = await foodEntryService.listFoodEntries(userId, query);

    res.status(200).json({
      success: true,
      message: 'Food entries retrieved successfully',
      ...page,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food-entries/summary
 * One day's calorie and macro totals alongside the current user's goal.
 */
export async function getDailyIntakeSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, foodEntrySummarySchema);
    const summary = await dailyIntakeService.getDailyIntakeSummary(userId, query.date);

    res.status(200).json({
      success: true,
      message: 'Daily summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food-entries/series
 * Day-by-day totals across a date range, with the current user's goal.
 */
export async function getDailyIntakeSeries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, foodEntrySeriesSchema);
    const series = await dailyIntakeService.getDailyIntakeSeries(
      userId,
      query.startDate,
      query.endDate
    );

    res.status(200).json({
      success: true,
      message: 'Daily series retrieved successfully',
      data: series,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/food-entries/:id
 * One of the current user's entries, used to pre-fill the edit form.
 */
export async function getFoodEntry(
  req: Request<FoodEntryParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const foodEntry = await foodEntryService.getFoodEntry(userId, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Food entry retrieved successfully',
      data: { foodEntry },
    });
  } catch (error) {
    next(error);
  }
}
