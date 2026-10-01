/**
 * Every Redis key the backend writes is built here, so the full keyspace can be
 * read in one place (and is documented in REDIS.md). The `intake:` namespace
 * lets the app share a Redis instance with other services safely.
 */
const NAMESPACE = 'intake';

export const redisKeys = {
  /** Prefix handed to BullMQ; it appends `:<queue name>:<job id>` and its own bookkeeping keys. */
  queuePrefix: `${NAMESPACE}:bull`,

  /** Prefix handed to rate-limit-redis; the limiter appends the client key (`user:<id>` or `ip:<addr>`). */
  rateLimitPrefix: (policyName: string) => `${NAMESPACE}:rl:${policyName}:`,

  /** A refresh token already exchanged at /auth/refresh, by its `jti` claim. */
  rotatedRefreshToken: (tokenId: string) => `${NAMESPACE}:auth:rotated-token:${tokenId}`,

  /** A signed-out session, by the `sid` claim its access and refresh tokens share. */
  revokedSession: (sessionId: string) => `${NAMESPACE}:auth:revoked-session:${sessionId}`,

  /** Epoch seconds before which every access and refresh token of this user is rejected. */
  sessionsRevokedAt: (userId: string) => `${NAMESPACE}:auth:sessions-revoked-at:${userId}`,
};
