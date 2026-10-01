import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { getValidatedInput } from '../middleware/validate';
import {
  getSharedMealSchema,
  listSharedMealsSchema,
  markSharesSeenSchema,
  revokeMealAccessSchema,
  shareMealSchema,
} from '../schemas/sharedMeal.schema';
import * as sharedMealService from '../services/sharedMeal.service';
import * as sharedMealAccessService from '../services/sharedMealAccess.service';

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

/**
 * GET /api/shared-meals/sent
 * One page of the current user's shared meals, one row per meal with everyone it is shared with.
 */
export async function listSentMeals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, listSharedMealsSchema);
    const page = await sharedMealAccessService.listMealsSharedBy(userId, query);

    res.status(200).json({
      success: true,
      message: 'Sent meals retrieved successfully',
      ...page,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/shared-meals/:mealId/access
 * Revokes access to one of the current user's meals for the listed recipients.
 */
export async function revokeMealAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params, body } = getValidatedInput(req, revokeMealAccessSchema);
    const access = await sharedMealAccessService.revokeMealAccess(userId, params.mealId, body);

    res.status(200).json({
      success: true,
      message: 'Meal access updated successfully',
      data: access,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shared-meals/unseen-count
 * How many meals shared with the current user they have not seen yet.
 */
export async function getUnseenShareCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const count = await sharedMealService.countUnseenShares(userId);

    res.status(200).json({
      success: true,
      message: 'Unseen share count retrieved successfully',
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/shared-meals/seen
 * Marks shares the current user has received as seen.
 */
export async function markSharesSeen(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, markSharesSeenSchema);
    const markedCount = await sharedMealService.markSharesSeen(userId, body);

    res.status(200).json({
      success: true,
      message: 'Shares marked as seen',
      data: { markedCount },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shared-meals/received/:shareId
 * The full details of one meal shared with the current user.
 */
export async function getSharedMeal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params } = getValidatedInput(req, getSharedMealSchema);
    const sharedMeal = await sharedMealService.getMealSharedWith(userId, params.shareId);

    res.status(200).json({
      success: true,
      message: 'Shared meal retrieved successfully',
      data: sharedMeal,
    });
  } catch (error) {
    next(error);
  }
}
