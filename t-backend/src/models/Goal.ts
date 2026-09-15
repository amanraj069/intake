import mongoose, { Schema, Document } from 'mongoose';
import { CalendarDay } from '../lib/calendarDay';

/**
 * Goals are versioned: updating a target does not overwrite history, it closes
 * out the current version and opens a new one starting today. `startDate` is
 * the first day this version applies; `endDate` is the first day it no longer
 * applies (exclusive), or null while it is still the active goal. Exactly one
 * version per user has `endDate: null` at a time.
 */
export interface IGoalDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  weightGoalKg?: number;
  startDate: CalendarDay;
  endDate: CalendarDay | null;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dailyCalorieTarget: {
      type: Number,
      required: true,
      min: 0,
    },
    proteinTargetG: {
      type: Number,
      required: true,
      min: 0,
    },
    carbTargetG: {
      type: Number,
      required: true,
      min: 0,
    },
    fatTargetG: {
      type: Number,
      required: true,
      min: 0,
    },
    weightGoalKg: {
      type: Number,
      min: 0,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One version per user per day: editing a goal again the same day updates that
// version in place rather than creating a duplicate.
goalSchema.index({ userId: 1, startDate: 1 }, { unique: true, name: 'userId_startDate_unique' });

// At most one active (open-ended) version per user. Named explicitly so it
// never collides with the single-field `userId` index the pre-versioning
// schema used, which the migration script drops by name.
goalSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { endDate: null }, name: 'userId_active_unique' }
);

export const Goal = mongoose.model<IGoalDocument>('Goal', goalSchema);
