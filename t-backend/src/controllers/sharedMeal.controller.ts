import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { getValidatedInput } from '../middleware/validate';
import { listSharedMealsSchema, shareMealSchema } from '../schemas/sharedMeal.schema';
import * as sharedMealService from '../services/sharedMeal.service';

/**
 * POST /api/shared-meals
 * Shares one of the current user's meals with another user, found by email.
 */
export async function shareMeal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, shareMealSchema);
    await sharedMealService.shareMeal(userId, body);

    res.status(201).json({
      success: true,
      message: 'Meal shared successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shared-meals
 * One page of the meals other users have shared with the current user.
 */
export async function listSharedMeals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, listSharedMealsSchema);
    const page = await sharedMealService.listMealsSharedWith(userId, query);

    res.status(200).json({
      success: true,
      message: 'Shared meals retrieved successfully',
      ...page,
    });
  } catch (error) {
    next(error);
  }
}
