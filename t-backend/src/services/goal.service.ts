import { Goal, IGoalDocument } from '../models/Goal';
import { CalendarDay, today } from '../lib/calendarDay';
import { UpsertGoalInput } from '../schemas/goal.schema';

/** Fields that make up one goal version, shared by every write path. */
function targetFields(input: UpsertGoalInput) {
  return {
    dailyCalorieTarget: input.dailyCalorieTarget,
    proteinTargetG: input.proteinTargetG,
    carbTargetG: input.carbTargetG,
    fatTargetG: input.fatTargetG,
    weightGoalKg: input.weightGoalKg,
  };
}

/**
 * Sets the user's goal, effective from `effectiveDate` (today by default).
 * Goals are versioned by date range rather than overwritten in place: the
 * previously active version is closed out as of `effectiveDate`, and a new
 * version is opened so past reports keep comparing against the goal that was
 * actually active on each day. Editing the goal again on the same day updates
 * that day's version instead of stacking up a second entry.
 */
export async function upsertGoal(
  userId: string,
  input: UpsertGoalInput,
  effectiveDate: CalendarDay = today()
): Promise<IGoalDocument> {
  const fields = targetFields(input);
  const current = await Goal.findOne({ userId, endDate: null });

  if (current && current.startDate === effectiveDate) {
    // Assigning `undefined` unsets a defaultless path on save, same as $unset.
    current.set(fields);
    await current.save();
    return current;
  }

  if (current) {
    current.endDate = effectiveDate;
    await current.save();
  }

  return Goal.create({
    userId,
    startDate: effectiveDate,
    endDate: null,
    ...fields,
  });
}

/** Returns the user's currently active goal, or null if they have not set one yet. */
export async function findGoalByUserId(userId: string): Promise<IGoalDocument | null> {
  return Goal.findOne({ userId, endDate: null });
}

/** Returns whichever goal version was active on `date`, or null if none was. */
export async function findGoalForDate(
  userId: string,
  date: CalendarDay
): Promise<IGoalDocument | null> {
  return Goal.findOne({
    userId,
    startDate: { $lte: date },
    $or: [{ endDate: null }, { endDate: { $gt: date } }],
  });
}

/**
 * Every goal version whose active range overlaps `[startDate, endDate]`,
 * oldest first, for building a per-day target series over a date range.
 */
export async function findGoalsOverlappingRange(
  userId: string,
  startDate: CalendarDay,
  endDate: CalendarDay
): Promise<IGoalDocument[]> {
  return Goal.find({
    userId,
    startDate: { $lte: endDate },
    $or: [{ endDate: null }, { endDate: { $gt: startDate } }],
  }).sort({ startDate: 1 });
}
