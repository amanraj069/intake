import mongoose, { Schema, Document } from 'mongoose';

/**
 * One meal one user has shared with another. The meal itself is never copied:
 * the recipient reads the owner's live entry, so an edit by the owner shows up
 * for everyone it was shared with.
 */
export interface ISharedItemDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userIdSharing: mongoose.Types.ObjectId;
  userIdShared: mongoose.Types.ObjectId;
  mealId: mongoose.Types.ObjectId;
  /** When the recipient first saw the share; null while it is still new to them. */
  seenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sharedItemSchema = new Schema<ISharedItemDocument>(
  {
    userIdSharing: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userIdShared: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mealId: {
      type: Schema.Types.ObjectId,
      ref: 'FoodEntry',
      required: true,
      index: true,
    },
    seenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Sharing the same meal with the same person twice is a no-op, and the
// recipient's "shared with me" list is the dominant read, so both lead with it.
sharedItemSchema.index({ userIdShared: 1, mealId: 1 }, { unique: true });
sharedItemSchema.index({ userIdShared: 1, createdAt: -1 });
sharedItemSchema.index({ userIdSharing: 1, createdAt: -1 });
// Backs the sidebar's unseen-share badge, which is polled.
sharedItemSchema.index({ userIdShared: 1, seenAt: 1 });

export const SharedItem = mongoose.model<ISharedItemDocument>(
  'SharedItem',
  sharedItemSchema,
  'sharedItems'
);
