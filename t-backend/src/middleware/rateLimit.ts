import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AugmentedRequest, ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { RATE_LIMIT_POLICIES, RateLimitPolicy } from '../lib/rateLimitPolicies';
import { AppError } from './errorHandler';

export const RATE_LIMITED_CODE = 'RATE_LIMITED';

function isRateLimitingEnabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED !== 'false';
}

/**
 * Signed-in users are counted by account, so people sharing an office or
 * mobile carrier IP do not exhaust each other's allowance. Everyone else is
 * counted by IP, grouped by /56 subnet for IPv6 so rotating addresses within
 * one allocation does not reset the counter.
 */
function clientKey(req: Request): string {
  if (req.user?._id) return `user:${req.user._id}`;
  return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

function secondsUntil(resetTime: Date | undefined, fallbackMs: number): number {
  const remainingMs = resetTime ? resetTime.getTime() - Date.now() : fallbackMs;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

/**
 * Builds an Express middleware enforcing one policy. Rejections go through the
 * central error handler, so a 429 has the same envelope as every other failure.
 */
export function createRateLimiter(policy: RateLimitPolicy): RequestHandler {
  return rateLimit({
    windowMs: policy.windowMs,
    limit: policy.maxRequests,
    skipSuccessfulRequests: policy.countFailuresOnly ?? false,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: clientKey,
    skip: () => !isRateLimitingEnabled(),
    handler: (req: Request, _res: Response, next: NextFunction) => {
      const retryAfterSeconds = secondsUntil(
        (req as AugmentedRequest).rateLimit?.resetTime,
        policy.windowMs
      );
      console.warn(
        `[RateLimit] ${policy.name} exceeded by ${clientKey(req)} on ${req.method} ${req.originalUrl}`
      );
      next(new AppError(policy.message, 429, RATE_LIMITED_CODE, { retryAfterSeconds }));
    },
  });
}

export const generalRateLimit = createRateLimiter(RATE_LIMIT_POLICIES.general);
export const credentialAttemptsRateLimit = createRateLimiter(
  RATE_LIMIT_POLICIES.credentialAttempts
);
export const accountCreationRateLimit = createRateLimiter(RATE_LIMIT_POLICIES.accountCreation);
export const emailDeliveryRateLimit = createRateLimiter(RATE_LIMIT_POLICIES.emailDelivery);
export const aiRequestsRateLimit = createRateLimiter(RATE_LIMIT_POLICIES.aiRequests);
export const fileUploadsRateLimit = createRateLimiter(RATE_LIMIT_POLICIES.fileUploads);
