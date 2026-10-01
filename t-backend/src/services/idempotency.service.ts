import { randomUUID } from 'node:crypto';

import { AppError } from '../middleware/errorHandler';
import { IdempotencyRecord } from '../models/IdempotencyRecord';

/**
 * A claim older than this belongs to a request that crashed or hung: every
 * guarded write finishes in seconds, so a retry may take it over.
 */
const ABANDONED_CLAIM_MS = 2 * 60 * 1000;
const DUPLICATE_KEY_ERROR = 11000;

export interface IdempotencyIdentity {
  userId: string;
  scope: string;
  key: string;
}

export interface HeldClaim {
  recordId: string;
  lockToken: string;
}

export type IdempotencyClaim =
  | { outcome: 'claimed'; claim: HeldClaim }
  | { outcome: 'replay'; statusCode: number; body: unknown };

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number })?.code === DUPLICATE_KEY_ERROR;
}

async function insertClaim(identity: IdempotencyIdentity, fingerprint: string): Promise<HeldClaim | null> {
  const lockToken = randomUUID();
  try {
    const record = await IdempotencyRecord.create({
      ...identity,
      fingerprint,
      state: 'in-progress',
      lockToken,
      lockedAt: new Date(),
    });
    return { recordId: record._id.toString(), lockToken };
  } catch (error) {
    if (isDuplicateKeyError(error)) return null;
    throw error;
  }
}

/** Hands an abandoned claim to this request, unless another retry took it first. */
async function takeOverAbandonedClaim(recordId: string): Promise<HeldClaim | null> {
  const lockToken = randomUUID();
  const takenOver = await IdempotencyRecord.findOneAndUpdate(
    { _id: recordId, state: 'in-progress', lockedAt: { $lt: new Date(Date.now() - ABANDONED_CLAIM_MS) } },
    { $set: { lockToken, lockedAt: new Date() } }
  );
  return takenOver ? { recordId, lockToken } : null;
}

function inProgressError(): AppError {
  return new AppError(
    'This request is still being processed. Wait a moment before trying again.',
    409,
    'IDEMPOTENCY_REQUEST_IN_PROGRESS'
  );
}

async function resolveExistingClaim(identity: IdempotencyIdentity, fingerprint: string): Promise<IdempotencyClaim> {
  const existing = await IdempotencyRecord.findOne(identity).lean();
  // Released by a failed attempt between our insert and this read: one more insert settles it.
  if (!existing) {
    const claim = await insertClaim(identity, fingerprint);
    if (claim) return { outcome: 'claimed', claim };
    throw inProgressError();
  }

  if (existing.fingerprint !== fingerprint) {
    throw new AppError(
      'This idempotency key was already used for a different request.',
      422,
      'IDEMPOTENCY_KEY_REUSED'
    );
  }
  if (existing.state === 'completed') {
    return { outcome: 'replay', statusCode: existing.statusCode ?? 200, body: existing.responseBody };
  }

  const claim = await takeOverAbandonedClaim(existing._id.toString());
  if (claim) return { outcome: 'claimed', claim };
  throw inProgressError();
}

/**
 * Claims a key before a write runs. The first request for a key gets to run;
 * a repeat of a finished one gets its stored response; a repeat of one still
 * running is refused, so the write can never happen twice.
 *
 * @throws AppError IDEMPOTENCY_KEY_REUSED or IDEMPOTENCY_REQUEST_IN_PROGRESS.
 */
export async function claimIdempotencyKey(identity: IdempotencyIdentity, fingerprint: string): Promise<IdempotencyClaim> {
  const claim = await insertClaim(identity, fingerprint);
  if (claim) return { outcome: 'claimed', claim };
  return resolveExistingClaim(identity, fingerprint);
}

/** Stores the response, so every later repeat of the key replays it instead of writing again. */
export async function completeIdempotentRequest(claim: HeldClaim, statusCode: number, body: unknown): Promise<void> {
  await IdempotencyRecord.updateOne(
    { _id: claim.recordId, lockToken: claim.lockToken },
    { $set: { state: 'completed', statusCode, responseBody: body } }
  );
}

/** Frees the key after a failed attempt, so the same request can be retried. */
export async function releaseIdempotencyKey(claim: HeldClaim): Promise<void> {
  await IdempotencyRecord.deleteOne({ _id: claim.recordId, lockToken: claim.lockToken, state: 'in-progress' });
}
