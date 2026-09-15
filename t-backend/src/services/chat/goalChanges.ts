import { IGoalDocument } from '../../models/Goal';
import { UpsertGoalInput } from '../../schemas/goal.schema';

const GOAL_TARGET_KEYS = ['dailyCalorieTarget', 'proteinTargetG', 'carbTargetG', 'fatTargetG', 'weightGoalKg'] as const;

/** The targets a goal proposal changes. Every other target keeps whatever the saved goal holds when it is confirmed. */
export type GoalChanges = Partial<UpsertGoalInput>;

/** Lays changed targets over a goal, because saving a goal replaces every target on it. */
export function applyGoalChanges(changes: Record<string, unknown>, goal: IGoalDocument | null): Record<string, unknown> {
  return Object.fromEntries(GOAL_TARGET_KEYS.map((key) => [key, changes[key] ?? goal?.[key]]));
}

/** The targets of `goal` that differ from the saved goal, or every set target when there is no saved goal. */
export function changedGoalTargets(goal: UpsertGoalInput, saved: IGoalDocument | null): GoalChanges {
  const changedKeys = GOAL_TARGET_KEYS.filter((key) => goal[key] !== undefined && saved?.[key] !== goal[key]);
  return Object.fromEntries(changedKeys.map((key) => [key, goal[key]]));
}
