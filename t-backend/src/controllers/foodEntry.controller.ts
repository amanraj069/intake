import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
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
