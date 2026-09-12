import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { getValidatedInput } from '../middleware/validate';
import {
  weeklyCaloriesSchema,
  macrosSchema,
  microsSchema,
  goalComparisonSchema,
} from '../schemas/report.schema';
import * as reportService from '../services/report.service';

/**
 * GET /api/reports/weekly-calories
 * Daily calorie totals across a date range, shaped for a line/bar chart.
 */
export async function getWeeklyCalories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, weeklyCaloriesSchema);
    const data = await reportService.getWeeklyCalories(userId, query.startDate, query.endDate);

    res.status(200).json({
      success: true,
      message: 'Weekly calories retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/macros
 * Protein/carb/fat totals grouped by day or week.
 */
export async function getMacroBreakdown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, macrosSchema);
    const data = await reportService.getMacroBreakdown(
      userId,
      query.startDate,
      query.endDate,
      query.groupBy
    );

    res.status(200).json({
      success: true,
      message: 'Macro breakdown retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/micros
 * Summed micronutrient totals across the date range.
 */
export async function getMicroSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, microsSchema);
    const data = await reportService.getMicroSummary(userId, query.startDate, query.endDate);

    res.status(200).json({
      success: true,
      message: 'Micro summary retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/goal-comparison
 * Per-day actual vs. target calories.
 */
export async function getGoalComparison(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, goalComparisonSchema);
    const data = await reportService.getGoalComparison(userId, query.startDate, query.endDate);

    res.status(200).json({
      success: true,
      message: 'Goal comparison retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}
