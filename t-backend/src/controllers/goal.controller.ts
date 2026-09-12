import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import * as goalService from '../services/goal.service';

/**
 * POST /api/goals
 * Creates or overwrites the current user's single active goal.
 */
export async function upsertGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const goal = await goalService.upsertGoal(userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Goal saved successfully',
      data: { goal },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/goals
 * Returns the current user's goal, or null when none has been set.
 */
export async function getGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const goal = await goalService.findGoalByUserId(userId);

    res.status(200).json({
      success: true,
      message: goal ? 'Goal retrieved successfully' : 'No goal has been set yet',
      data: { goal },
    });
  } catch (error) {
    next(error);
  }
}
