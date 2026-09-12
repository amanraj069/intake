import mongoose, { Schema, Document } from 'mongoose';

export interface IGoalDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  weightGoalKg?: number;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoalDocument>(
  {
    // Unique: a user has exactly one active goal, which is overwritten on update
    // rather than versioned into a history.
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

export const Goal = mongoose.model<IGoalDocument>('Goal', goalSchema);
