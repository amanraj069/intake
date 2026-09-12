import { Goal, IGoalDocument } from '../models/Goal';
import { UpsertGoalInput } from '../schemas/goal.schema';

/**
 * Creates the user's goal, or overwrites it if one already exists.
 * Goals are not versioned: a user has exactly one active goal at a time.
 */
export async function upsertGoal(
  userId: string,
  input: UpsertGoalInput
): Promise<IGoalDocument> {
  // `weightGoalKg` is optional, so an omitted value must be unset rather than
  // left over from the previous goal.
  const update: Record<string, unknown> = {
    $set: {
      dailyCalorieTarget: input.dailyCalorieTarget,
      proteinTargetG: input.proteinTargetG,
      carbTargetG: input.carbTargetG,
      fatTargetG: input.fatTargetG,
      ...(input.weightGoalKg === undefined ? {} : { weightGoalKg: input.weightGoalKg }),
    },
    ...(input.weightGoalKg === undefined ? { $unset: { weightGoalKg: '' } } : {}),
  };

  const goal = await Goal.findOneAndUpdate({ userId }, update, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

  return goal;
}

/** Returns the user's active goal, or null if they have not set one yet. */
export async function findGoalByUserId(userId: string): Promise<IGoalDocument | null> {
  return Goal.findOne({ userId });
}
