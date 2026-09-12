import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { getValidatedInput } from '../middleware/validate';
import {
  foodEntrySummarySchema,
  listFoodEntriesSchema,
} from '../schemas/foodEntry.schema';
import * as dailyIntakeService from '../services/dailyIntake.service';
import * as foodEntryService from '../services/foodEntry.service';

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
    const foodEntry = await foodEntryService.createFoodEntry(userId, req.body);

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
    const foodEntry = await foodEntryService.updateFoodEntry(userId, req.params.id, req.body);

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
