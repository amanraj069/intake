import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { toUserResponse } from '../lib/userResponse';
import { getValidatedInput } from '../middleware/validate';
import { completeOnboardingSchema, generatePlanSchema } from '../schemas/onboarding.schema';
import * as nutritionPlanService from '../services/nutritionPlan.service';
import * as onboardingService from '../services/onboarding.service';

/**
 * POST /api/onboarding/plan
 * Calculates BMI and recommended daily targets from a body profile. Saves nothing.
 */
export async function generatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = getValidatedInput(req, generatePlanSchema);
    const plan = await nutritionPlanService.generateNutritionPlan(body);

    res.json({
      success: true,
      message: plan.source === 'ai' ? 'Plan generated' : 'Plan calculated with the standard formula',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/onboarding/complete
 * Saves the body profile, writes the accepted targets as the user's goal, and
 * returns the updated user.
 */
export async function completeOnboarding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, completeOnboardingSchema);
    const user = await onboardingService.completeOnboarding(userId, body);

    res.json({
      success: true,
      message: 'Your goals are set',
      data: { user: toUserResponse(user) },
    });
  } catch (error) {
    next(error);
  }
}
