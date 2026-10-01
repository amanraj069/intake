import mongoose, { Schema, Document } from 'mongoose';

/** Long enough to cover any client retry loop or a user re-submitting the next morning. */
const RECORD_TTL_SECONDS = 24 * 60 * 60;

export type IdempotencyState = 'in-progress' | 'completed';

/**
 * One write request made with an `Idempotency-Key`. The unique index on
 * (userId, scope, key) is the lock: whichever request inserts first runs the
 * write, and every repeat either waits it out or replays its response.
 */
export interface IIdempotencyRecordDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** Which endpoint the key was used on, so one key cannot collide across endpoints. */
  scope: string;
  key: string;
  /** Hash of the request body, so a reused key with a different payload is caught. */
  fingerprint: string;
  state: IdempotencyState;
  /** Identifies the request holding the claim, so a request that was taken over cannot settle it. */
  lockToken: string;
  lockedAt: Date;
  statusCode?: number;
  responseBody?: unknown;
  createdAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecordDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    state: { type: String, enum: ['in-progress', 'completed'], required: true },
    lockToken: { type: String, required: true },
    lockedAt: { type: Date, required: true },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, expires: RECORD_TTL_SECONDS },
  },
  { versionKey: false }
);

idempotencyRecordSchema.index({ userId: 1, scope: 1, key: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecordDocument>(
  'IdempotencyRecord',
  idempotencyRecordSchema
);
