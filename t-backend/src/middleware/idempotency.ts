import { createHash } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import {
  HeldClaim,
  claimIdempotencyKey,
  completeIdempotentRequest,
  releaseIdempotencyKey,
} from '../services/idempotency.service';
import { AppError } from './errorHandler';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** A retry sends the same bytes, so the parsed body (and photo, if any) identify the request. */
function fingerprintRequest(req: Request): string {
  const hash = createHash('sha256').update(JSON.stringify(req.body ?? null));
  if (req.file) hash.update(req.file.buffer);
  return hash.digest('hex');
}

function isSuccess(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Only a success is stored: after a failure the key is freed, so the user
 * can retry the same request or fix it and send it again.
 */
async function settleClaim(claim: HeldClaim, statusCode: number, body: unknown): Promise<void> {
  try {
    if (isSuccess(statusCode)) await completeIdempotentRequest(claim, statusCode, body);
    else await releaseIdempotencyKey(claim);
  } catch (error) {
    // The write itself already happened; an unsettled claim only makes a repeat wait for its lock to expire.
    console.error('[Idempotency] Could not settle a claim:', (error as Error).message);
  }
}

/**
 * Settles the claim as the handler responds, and before the response leaves.
 * Waiting for the socket instead would be wrong: a client that drops mid-write
 * closes it early, and freeing the key then would let its retry write twice.
 */
function settleOnResponse(res: Response, claim: HeldClaim): void {
  const sendJson = res.json.bind(res);
  res.json = (body: unknown) => {
    void settleClaim(claim, res.statusCode, body).finally(() => sendJson(body));
    return res;
  };
}

/**
 * Makes a write endpoint safe to repeat. A request carrying an
 * `Idempotency-Key` header runs at most once per user and `scope`; repeats get
 * the first response back with `Idempotent-Replayed: true`. Requests without
 * the header behave as before. Mount after `requireAuth` and any body parsing.
 */
export function idempotent(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.get('Idempotency-Key');
    if (key === undefined) return next();

    try {
      if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
        throw new AppError(
          'Idempotency-Key must be 8 to 128 letters, digits, hyphens or underscores.',
          400,
          'INVALID_IDEMPOTENCY_KEY'
        );
      }

      const userId = getAuthenticatedUserId(req);
      const result = await claimIdempotencyKey({ userId, scope, key }, fingerprintRequest(req));
      if (result.outcome === 'replay') {
        res.set('Idempotent-Replayed', 'true').status(result.statusCode).json(result.body);
        return;
      }

      settleOnResponse(res, result.claim);
      next();
    } catch (error) {
      next(error);
    }
  };
}
