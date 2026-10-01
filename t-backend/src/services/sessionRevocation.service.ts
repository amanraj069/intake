import { REFRESH_TOKEN_TTL_SECONDS } from '../lib/jwt';
import { redisKeys } from '../lib/redisKeys';
import { createTtlStore } from '../lib/ttlStore';
import { AppError } from '../middleware/errorHandler';
import { AccessTokenClaims, RefreshTokenClaims } from '../types';

export const SESSION_REVOKED_CODE = 'SESSION_REVOKED';
export const SESSION_STORE_UNAVAILABLE_CODE = 'SESSION_STORE_UNAVAILABLE';

/**
 * Two browser tabs can both refresh with the same cookie at the same moment.
 * The first one rotates the token; this window lets the second one through
 * instead of logging the user out of every tab.
 */
export const ROTATION_GRACE_SECONDS = 30;

const store = createTtlStore();

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** A record only has to outlive the token it blocks; after that, the JWT expiry rejects it anyway. */
function secondsUntilExpiry(claims: RefreshTokenClaims): number {
  return Math.max(1, claims.exp - nowInSeconds());
}

/** An unexpected store failure becomes a 503, so the client retries instead of treating the session as dead. */
async function withSessionStore<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('[Sessions] Session store unavailable:', error);
    throw new AppError(
      'Sign-in service is temporarily unavailable. Please try again shortly.',
      503,
      SESSION_STORE_UNAVAILABLE_CODE
    );
  }
}

function revokedSessionError(): AppError {
  return new AppError('Your session has ended. Please sign in again.', 401, SESSION_REVOKED_CODE);
}

/** The keys that decide whether any token of this session is still honoured. */
function sessionStateKeys(claims: AccessTokenClaims): string[] {
  const keys = [redisKeys.sessionsRevokedAt(claims.userId)];
  if (claims.sid) keys.push(redisKeys.revokedSession(claims.sid));
  return keys;
}

/**
 * True when the user signed out everywhere after this token was issued, or
 * this token's session was logged out. Tokens issued in the same second as a
 * sign-out-everywhere survive, so the session that triggered it stays signed in.
 */
function isSessionEnded(
  claims: AccessTokenClaims,
  [sessionsRevokedAt, sessionRevoked]: (string | null)[]
): boolean {
  if (sessionsRevokedAt !== null && claims.iat < Number(sessionsRevokedAt)) return true;
  return Boolean(sessionRevoked);
}

function isWithinRotationGrace(rotatedAtSeconds: string): boolean {
  return nowInSeconds() - Number(rotatedAtSeconds) <= ROTATION_GRACE_SECONDS;
}

/**
 * Checked on every authenticated request, in one round trip. The store already
 * falls back to memory when Redis is down, so this only fails on an unexpected
 * error, and then allows the request (logged) rather than signing the user out.
 */
export async function isAccessTokenRevoked(claims: AccessTokenClaims): Promise<boolean> {
  try {
    return isSessionEnded(claims, await store.getMany(sessionStateKeys(claims)));
  } catch (error) {
    console.error('[Sessions] Could not check access token revocation, allowing request:', error);
    return false;
  }
}

/**
 * Kept for one refresh-token lifetime: once a session is revoked no new tokens
 * are minted for it, so that is the longest any of its tokens can still be valid.
 */
async function writeSessionRevocation(sessionId: string): Promise<void> {
  await store.set(redisKeys.revokedSession(sessionId), String(nowInSeconds()), REFRESH_TOKEN_TTL_SECONDS);
}

/**
 * A refresh token presented again after its grace window means two parties
 * hold copies of it: the user and whoever copied it. There is no telling which
 * is which, so the whole session is ended and the real user signs in again,
 * rather than leaving the session with whichever side refreshed first.
 */
async function endSessionOnReuse(claims: RefreshTokenClaims): Promise<void> {
  console.warn(
    `[Sessions] Refresh token reuse detected for user ${claims.userId}, ending session ${claims.sid ?? '(none)'}`
  );
  if (claims.sid) await writeSessionRevocation(claims.sid);
}

/**
 * Checks a refresh token against its session and the rotation list, then
 * retires it, so each refresh token can mint new cookies once (plus the short
 * grace window). Throws 401 `SESSION_REVOKED` for a revoked token, and ends
 * the session when a retired token is replayed.
 */
export async function consumeRefreshToken(claims: RefreshTokenClaims): Promise<void> {
  await withSessionStore(async () => {
    const rotationKey = redisKeys.rotatedRefreshToken(claims.jti);
    const [rotatedAt, ...sessionState] = await store.getMany([
      rotationKey,
      ...sessionStateKeys(claims),
    ]);
    if (isSessionEnded(claims, sessionState)) throw revokedSessionError();

    if (rotatedAt === null) {
      await store.set(rotationKey, String(nowInSeconds()), secondsUntilExpiry(claims));
      return;
    }
    if (isWithinRotationGrace(rotatedAt)) return;

    await endSessionOnReuse(claims);
    throw revokedSessionError();
  });
}

/** Ends one session (logout): its current access token and every refresh token in its chain are rejected. */
export async function revokeSession(sessionId: string): Promise<void> {
  await withSessionStore(() => writeSessionRevocation(sessionId));
}

/**
 * Signs a user out everywhere: every access and refresh token issued before
 * now is rejected. Kept for one refresh-token lifetime, after which all of
 * them have expired on their own.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await withSessionStore(() =>
    store.set(redisKeys.sessionsRevokedAt(userId), String(nowInSeconds()), REFRESH_TOKEN_TTL_SECONDS)
  );
}
