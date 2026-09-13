import { User, IUserDocument } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { upsertGoal } from './goal.service';
import type { CompleteOnboardingInput } from '../schemas/onboarding.schema';

/**
 * Saves the body profile and turns the accepted plan into the user's goal.
 *
 * The goal is written before the user is marked onboarded, and both writes are
 * idempotent. Without a transaction (standalone MongoDB has none) this order
 * means a failure between them leaves the user un-onboarded, so simply
 * retrying repairs it, rather than an onboarded user with no goal.
 */
export async function completeOnboarding(
  userId: string,
  input: CompleteOnboardingInput
): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Your account could not be found', 404);
  }

  await upsertGoal(userId, { ...input.targets, weightGoalKg: input.profile.goalWeightKg });

  user.bodyProfile = input.profile;
  user.onboardingCompletedAt ??= new Date();
  await user.save();

  return user;
}
