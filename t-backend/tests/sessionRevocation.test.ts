import './support/testEnv';

import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/lib/jwt';
import { MemoryTtlStore } from '../src/lib/ttlStore';
import { AppError } from '../src/middleware/errorHandler';
import {
  SESSION_REVOKED_CODE,
  consumeRefreshToken,
  isAccessTokenRevoked,
  revokeAllSessions,
  revokeSession,
} from '../src/services/sessionRevocation.service';
import { AccessTokenClaims, RefreshTokenClaims, TokenPayload } from '../src/types';

let userCounter = 0;

/** One sign-in: the payload its access and refresh tokens share. */
function newSession(userId = `user-${++userCounter}`): TokenPayload {
  return { userId, email: `${userId}@revocation.test`, sid: randomUUID() };
}

function refreshClaims(session: TokenPayload): RefreshTokenClaims {
  return verifyRefreshToken(generateRefreshToken(session));
}

function accessClaims(session: TokenPayload): AccessTokenClaims {
  return verifyAccessToken(generateAccessToken(session));
}

async function assertRefreshRevoked(claims: RefreshTokenClaims): Promise<void> {
  await assert.rejects(
    consumeRefreshToken(claims),
    (error: unknown) => error instanceof AppError && error.code === SESSION_REVOKED_CODE
  );
}

describe('MemoryTtlStore', () => {
  test('returns a value until its TTL passes', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const store = new MemoryTtlStore();

    await store.set('key', 'value', 60);
    assert.deepEqual(await store.getMany(['key', 'missing']), ['value', null]);

    t.mock.timers.tick(60_000);
    assert.equal(await store.get('key'), null);
  });

  test('drain hands over live entries with their remaining TTL and empties the store', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 0 });
    const store = new MemoryTtlStore();
    await store.set('live', 'kept', 60);
    await store.set('expiring', 'dropped', 5);

    t.mock.timers.tick(10_000);
    assert.deepEqual(store.drain(), [{ key: 'live', value: 'kept', ttlSeconds: 50 }]);
    assert.deepEqual(await store.getMany(['live', 'expiring']), [null, null]);
  });
});

describe('session revocation (in-memory fallback)', () => {
  test('every refresh token gets its own id', () => {
    const session = newSession();
    assert.notEqual(refreshClaims(session).jti, refreshClaims(session).jti);
  });

  test('a fresh session is honoured', async () => {
    const session = newSession();
    assert.equal(await isAccessTokenRevoked(accessClaims(session)), false);
    await consumeRefreshToken(refreshClaims(session));
  });

  test('logout revokes both the access token and the refresh token of that session', async () => {
    const session = newSession();
    await revokeSession(session.sid);

    assert.equal(await isAccessTokenRevoked(accessClaims(session)), true);
    await assertRefreshRevoked(refreshClaims(session));
  });

  test('logout leaves the same user\'s other sessions signed in', async () => {
    const loggedOut = newSession();
    const otherDevice = newSession(loggedOut.userId);
    await revokeSession(loggedOut.sid);

    assert.equal(await isAccessTokenRevoked(accessClaims(otherDevice)), false);
    await consumeRefreshToken(refreshClaims(otherDevice));
  });

  test('a rotated refresh token is accepted again only within the grace window', async (t) => {
    const claims = refreshClaims(newSession());
    t.mock.timers.enable({ apis: ['Date'], now: claims.iat * 1000 });

    await consumeRefreshToken(claims);
    t.mock.timers.tick(10_000);
    await consumeRefreshToken(claims);

    t.mock.timers.tick(60_000);
    await assertRefreshRevoked(claims);
  });

  test('reuse inside the grace window keeps the session alive', async (t) => {
    const session = newSession();
    const claims = refreshClaims(session);
    t.mock.timers.enable({ apis: ['Date'], now: claims.iat * 1000 });

    await consumeRefreshToken(claims);
    t.mock.timers.tick(5_000);
    await consumeRefreshToken(claims);

    assert.equal(await isAccessTokenRevoked(accessClaims(session)), false);
  });

  test('reuse after the grace window ends the whole session, including newer tokens', async (t) => {
    const session = newSession();
    const stolen = refreshClaims(session);
    t.mock.timers.enable({ apis: ['Date'], now: stolen.iat * 1000 });

    await consumeRefreshToken(stolen);
    t.mock.timers.tick(1_000);
    const rotated = refreshClaims(session);
    const currentAccess = accessClaims(session);

    t.mock.timers.tick(60_000);
    await assertRefreshRevoked(stolen);

    assert.equal(await isAccessTokenRevoked(currentAccess), true);
    await assertRefreshRevoked(rotated);
  });

  test('reuse ends only the affected session, not the user\'s other devices', async (t) => {
    const reused = newSession();
    const otherDevice = newSession(reused.userId);
    const claims = refreshClaims(reused);
    t.mock.timers.enable({ apis: ['Date'], now: claims.iat * 1000 });

    await consumeRefreshToken(claims);
    t.mock.timers.tick(60_000);
    await assertRefreshRevoked(claims);

    assert.equal(await isAccessTokenRevoked(accessClaims(otherDevice)), false);
  });

  test('a rotated refresh token is rejected inside the grace window once its session is logged out', async () => {
    const session = newSession();
    const claims = refreshClaims(session);
    await consumeRefreshToken(claims);
    await revokeSession(session.sid);

    await assertRefreshRevoked(claims);
  });

  test('revoking all sessions rejects older tokens of every kind, but not newer ones', async (t) => {
    const session = newSession();
    const olderRefresh = refreshClaims(session);
    const olderAccess = accessClaims(session);
    t.mock.timers.enable({ apis: ['Date'], now: (olderRefresh.iat + 5) * 1000 });

    await revokeAllSessions(session.userId);
    await assertRefreshRevoked(olderRefresh);
    assert.equal(await isAccessTokenRevoked(olderAccess), true);

    t.mock.timers.tick(1_000);
    const newer = newSession(session.userId);
    assert.equal(await isAccessTokenRevoked(accessClaims(newer)), false);
    await consumeRefreshToken(refreshClaims(newer));
  });

  test("revoking one user's sessions leaves other users signed in", async () => {
    const other = newSession();
    await revokeAllSessions(`user-${++userCounter}`);
    assert.equal(await isAccessTokenRevoked(accessClaims(other)), false);
  });

  test('a token signed before session ids existed is still honoured until its session is revoked', async () => {
    const { userId, email } = newSession();
    const legacy = verifyAccessToken(generateAccessToken({ userId, email } as TokenPayload));
    assert.equal(legacy.sid, undefined);
    assert.equal(await isAccessTokenRevoked(legacy), false);
  });
});
