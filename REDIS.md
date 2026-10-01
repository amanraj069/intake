# Redis in INTAKE

Redis is **optional**. It holds two kinds of short-lived state that would otherwise live in the
memory of a single server process:

1. **Rate-limit counters** for every throttling policy.
2. **Session revocation**: signed-out sessions, rotated refresh tokens, and "sign out
   everywhere" cutoffs. These are checked on **every authenticated request**, so a revoked access
   token stops working immediately, not when it expires.

With `REDIS_URL` set, that state is shared by every backend instance and survives restarts and
deploys. Without it, the backend uses in-process memory with exactly the same logic, which is fine
for local development and single-instance deployments.

**Users never depend on Redis being up.** If it is unreachable at startup or goes down while
running, every store switches to this process's memory within milliseconds, nobody is signed
out, nothing returns an error, and rate limits keep counting. Session records written during the
outage are copied into Redis when it reconnects. See [Failure behaviour](#failure-behaviour).

MongoDB stays the source of truth for all user data. Nothing in Redis is needed to rebuild the
app.

---

## Contents

- [Setup](#setup)
- [Architecture](#architecture)
- [Keyspace](#keyspace)
  - [Rate-limit counters](#1-rate-limit-counters)
  - [Signed-out sessions](#2-signed-out-sessions)
  - [Rotated refresh tokens](#3-rotated-refresh-tokens)
  - [Sign-out-everywhere cutoffs](#4-sign-out-everywhere-cutoffs)
- [Session lifecycle](#session-lifecycle)
- [Failure behaviour](#failure-behaviour)
- [Memory fallback](#memory-fallback)
- [Sizing](#sizing)
- [Inspecting Redis](#inspecting-redis)
- [Known limitations](#known-limitations)
- [Design decisions](#design-decisions)
- [Code map](#code-map)

---

## Setup

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# or Docker
docker run -d -p 6379:6379 --name intake-redis redis:7 \
  redis-server --appendonly yes --maxmemory-policy noeviction
```

With Homebrew, set the same two options in `$(brew --prefix)/etc/redis.conf`
(`appendonly yes`, `maxmemory-policy noeviction`) and run `brew services restart redis`.

Then add to `t-backend/.env`:

```bash
REDIS_URL=redis://localhost:6379
# hosted / TLS example: rediss://default:<password>@<host>:<port>
```

On startup the backend logs one of:

```
[Redis] Connected
[Redis] REDIS_URL not set, using in-memory stores
[Redis] Not reachable after 5s; starting on in-memory stores and retrying in the background
```

While running, an outage is logged once when it starts and once when it ends, however long it
lasts:

```
[Redis] Connection lost, using in-memory stores until it reconnects
[Redis] ECONNREFUSED: connection error (retrying in the background)
[Redis] Reconnected
[Redis] Replayed 4 buffered session records
```

`GET /health` reports the live connection state in `data.redis`: `connected`, `unavailable`
(configured but currently unreachable) or `disabled` (no `REDIS_URL`).

### Required Redis configuration

Rate-limit counters are safe to lose. **Revocation keys are not**: if one disappears before
its TTL, the session it blocks silently works again. So the instance needs:

| Setting | Value | Why |
|---|---|---|
| `maxmemory-policy` | `noeviction` | Every key the app writes has a TTL, so `volatile-*` policies can evict revocations too, and `allkeys-*` policies can evict anything. With `noeviction`, a full Redis rejects new writes instead; those writes fall back to memory like any Redis failure, and nothing already revoked is evicted. |
| `appendonly` | `yes` | Without AOF persistence, a Redis restart forgets every revocation. The default `appendfsync everysec` loses at most about a second of writes on a crash. |

At startup the backend reads both settings with `CONFIG GET` and logs a warning if either is
wrong:

```
[Redis] maxmemory-policy is "allkeys-lru"; use "noeviction" so revoked sessions cannot be evicted (see REDIS.md)
[Redis] appendonly is off; a Redis restart will forget revoked sessions (see REDIS.md)
```

Managed Redis providers often block `CONFIG`; the backend then logs that it could not verify the
settings, and they should be set in the provider's dashboard instead. Memory use is small
(see [Sizing](#sizing)), so `noeviction` does not need a large instance.

The test suite never uses Redis: `tests/support/testEnv.ts` unsets `REDIS_URL`, so tests run
against the memory fallback and never touch a developer's Redis.

---

## Architecture

```
request
  │
  ├─► generalRateLimit ───► FallbackRateLimitStore (intake:rl:general:)
  ├─► requireAuth ── isAccessTokenRevoked ──┐
  ├─► route rate limiter ─► FallbackRateLimitStore (intake:rl:<policy>:)
  └─► controller (login / refresh / logout / password flows)
            │                               │
            └──► sessionRevocation.service ◄┘
                          │
                   TtlStore interface
                   ├─ ResilientRedisTtlStore   (REDIS_URL set)
                   └─ MemoryTtlStore           (REDIS_URL not set)

FallbackRateLimitStore  = RedisStore while Redis is ready, else express-rate-limit MemoryStore
ResilientRedisTtlStore  = Redis while ready, else a MemoryTtlStore buffer replayed on reconnect
both ──► lib/redis.ts (one shared ioredis client) ──► Redis
```

- **One client.** `lib/redis.ts` creates a single `ioredis` connection and shares it between the
  rate limiters and the session store.
- **Decided per command, not once.** Each read or write checks whether the connection is ready
  right now. If it is not, the command goes to memory without waiting: the client is created with
  `enableOfflineQueue: false`, so nothing queues behind a dead connection.
- **Every reconnect re-attaches.** `onRedisReady()` runs on the first connection and on every
  reconnect. The rate-limit stores build a fresh `RedisStore` (which loads its Lua scripts), and
  the session store replays its buffer.
- **All key names live in `lib/redisKeys.ts`.** Every key is prefixed `intake:` so the app can
  share a Redis instance with other services.

---

## Keyspace

| Key pattern | Type | Value | TTL | Written by | Read by |
|---|---|---|---|---|---|
| `intake:rl:<policy>:user:<userId>` | string (integer) | Hits in the current window | The policy window (set on first hit) | rate-limit-redis Lua script | same script |
| `intake:rl:<policy>:ip:<address>` | string (integer) | Hits in the current window | The policy window | rate-limit-redis Lua script | same script |
| `intake:auth:revoked-session:<sid>` | string (integer) | Epoch seconds the session was signed out | 7 days (one refresh-token lifetime) | `POST /auth/logout` | `requireAuth` (every authenticated request), `POST /auth/refresh` |
| `intake:auth:rotated-token:<jti>` | string (integer) | Epoch seconds the refresh token was exchanged | Remaining lifetime of that refresh token | `POST /auth/refresh` | `POST /auth/refresh` |
| `intake:auth:sessions-revoked-at:<userId>` | string (integer) | Epoch seconds of the last "sign out everywhere" | 7 days (one refresh-token lifetime) | Password reset and both password-change flows | `requireAuth`, `POST /auth/refresh` |

No hashes, sets or lists are used. Every key is a plain string with a TTL, so Redis never holds
anything that outlives its purpose and no cleanup job is needed.

### 1. Rate-limit counters

Each policy in `lib/rateLimitPolicies.ts` gets its **own** `RedisStore` with its own prefix. A
shared store would make different policies count into the same bucket, since the client key
(`user:<id>`) is the same across policies.

| Policy (`<policy>` in the key) | Window | Limit | Counts |
|---|---|---|---|
| `general` | 15 min | 500 | Every request except `/health` |
| `credential-attempts` | 15 min | 10 | Failed responses only (login, OTP checks, password reset/change) |
| `account-creation` | 1 hour | 20 | `check-email`, `register` |
| `email-delivery` | 1 hour | 5 | Every endpoint that sends an email |
| `ai-requests` | 15 min | 40 | Gemini-backed endpoints |
| `file-uploads` | 1 hour | 10 | Avatar uploads |

**Client key.** Route-level policies that sit after `requireAuth` count signed-in requests as
`user:<mongoUserId>`. Everything else is counted as `ip:<address>`, including the `general`
policy for every request, since it runs before any route has identified the user. IP keys group IPv6 addresses by
`/56` subnet (e.g. `ip:2001:db8:abcd:1200::/56`, or `ip:::/56` for `::1` in local development).

**How a hit is counted.** rate-limit-redis runs a Lua script atomically:

1. If the key has no TTL left, `SET key 1 PX <windowMs>` (starts a new fixed window).
2. Otherwise `INCR key`.
3. Return the hit count and the remaining `PTTL`, which becomes the `RateLimit` and
   `Retry-After` headers.

Because the increment and the expiry check run in one script, two instances counting the same
client at the same moment can never lose a hit. For `credential-attempts`
(`skipSuccessfulRequests`), the limiter issues a `DECR` after a successful response, so only
failures stay counted.

The scripts are loaded with `SCRIPT LOAD` when the limiters are created and called with
`EVALSHA`. If Redis restarts and forgets them, the store gets `NOSCRIPT` and reloads them
automatically.

Example after one failed login from localhost:

```
intake:rl:general:ip:::/56              => "1"   PTTL 899958
intake:rl:credential-attempts:ip:::/56  => "1"   PTTL 899950
```

### 2. Signed-out sessions

Every sign-in (login, register, Google callback) starts a **session** with a random `sid`
(UUID v4). The `sid` is a claim in both the access token and the refresh token, and a refresh
keeps it, so every token minted for that sign-in carries the same `sid`.

```
intake:auth:revoked-session:26572fdb-7921-463b-be5a-194ad9a3d94a  => "1790820850"   TTL 604798
```

`POST /auth/logout` writes this key. From then on, `requireAuth` rejects the session's access
token on the very next request (`401 SESSION_REVOKED`), and `/auth/refresh` rejects every refresh
token in its chain, including one still inside the rotation grace window. Other sessions of the
same user (another device or browser) are untouched.

Logout reads the `sid` from the refresh cookie, or from the access cookie if the refresh cookie is
missing or invalid.

**TTL = 7 days.** Once a session is revoked, no new tokens are minted for it, so the longest any
of its tokens can still be valid is one refresh-token lifetime.

### 3. Rotated refresh tokens

Every refresh token also carries a random `jti` (UUID v4). Exchanging it at `/auth/refresh`
retires it:

```
intake:auth:rotated-token:17934935-6d07-4c22-9fc2-91d488dbd212  => "1790819719"   TTL 604797
```

A retired token is accepted again only within a **30-second grace window**. After that, presenting
it is treated as **token theft** (reuse detection):

- Two parties hold copies of the same refresh token: the user and whoever copied it. There is
  no telling which one is presenting it now.
- So the backend **ends the whole session** (writes `revoked-session:<sid>`) and rejects the
  request. The attacker's tokens and the user's current tokens die together; the user signs in
  again, and the attacker is locked out.
- Without this, whoever refreshed first would keep the session: an attacker who used a stolen
  token before the user did would take over, and the user would be the one signed out.
- Only that session is ended. The user's other devices stay signed in.

A legitimate client can trigger this only if it loses a refresh response (the server rotated,
but the new cookie never arrived) and retries more than 30 seconds later. The cost is a single
extra sign-in.

**TTL = `exp - now`** of that refresh token. Once the JWT has expired, signature verification
rejects it anyway, so the record is no longer needed and Redis drops it.

**Why the grace window.** The frontend deduplicates refreshes within one tab, but two open tabs
share the same cookie and can both hit `/auth/refresh` at the same instant. Without the window,
the second tab would be refused, its error handler would clear the shared cookies, and the user
would be signed out of every tab. The window is measured from the first rotation and is never
extended by later reuse.

### 4. Sign-out-everywhere cutoffs

```
intake:auth:sessions-revoked-at:6abdbd80b805355f52a37f6e  => "1790819733"   TTL 604800
```

One key per user, holding the epoch second of the last mass revocation. Any access or refresh
token of that user with `iat < cutoff` is rejected, by `requireAuth` and by `/auth/refresh`.
Written by:

| Flow | Endpoint | After the cutoff |
|---|---|---|
| Sign out other devices | `POST /auth/logout-other-devices` | Fresh cookies issued, so this browser stays signed in. |
| Forgot password, reset by OTP | `POST /auth/reset-password` | Cookies cleared; the user signs in with the new password. |
| Change password with the current one | `PATCH /auth/change-password` | Fresh cookies issued, so this browser stays signed in. |
| Change password by OTP | `POST /auth/verify-otp` (`purpose: change-password`) | Fresh cookies issued, so this browser stays signed in. |

The fresh cookies are issued in the same second as the cutoff, and the check is strict
(`iat < cutoff`), so the session that made the change survives while every older one is cut off.

**TTL = 7 days**, the refresh-token lifetime. After that, every token issued before the cutoff
has expired on its own. Writing a new cutoff replaces the old one and restarts the TTL.

The cutoff is written **after** the new password is saved, so a failed database write never
signs anyone out. Writing the cutoff itself cannot fail for the user: with Redis down it goes to
memory and is replayed later.

---

## Session lifecycle

```
login / register / Google callback
  └─► new session S: access_token (15 min, sid = S) + refresh_token (7 days, sid = S, jti = A)

every authenticated request (requireAuth), one MGET:
  ├─ iat < sessions-revoked-at:<user>          → 401 SESSION_REVOKED
  ├─ revoked-session:S exists                  → 401 SESSION_REVOKED
  └─ otherwise                                 → continue to the user lookup in MongoDB

access token expires → POST /auth/refresh with A, one MGET:
  ├─ iat < sessions-revoked-at:<user>          → 401 SESSION_REVOKED
  ├─ revoked-session:S exists                  → 401 SESSION_REVOKED
  ├─ rotated-token:A missing                   → write it, issue new tokens (sid = S, jti = B)
  ├─ rotated-token:A ≤ 30 s ago                → issue new tokens (concurrent tab)
  └─ rotated-token:A > 30 s ago                → reuse detected: write revoked-session:S, 401 SESSION_REVOKED

POST /auth/logout
  └─► write revoked-session:S, clear cookies

password reset / change, or POST /auth/logout-other-devices
  └─► write sessions-revoked-at:<user> = now
```

**Revocation is immediate.** Both checks run in `requireAuth`, before the request reaches any
controller, as a single `MGET` of at most two keys. That adds one Redis round trip (well under a
millisecond on a local network) to authenticated requests, which already make a MongoDB user
lookup, so the overhead is small.

When an access token is rejected with `SESSION_REVOKED`, the frontend's existing `401` handling
tries `/auth/refresh`, which is rejected too and clears both cookies, and the user is sent to
sign in.

**Tokens signed before session ids existed** have no `sid`. They are still checked against the
per-user cutoff, and their first refresh starts a new session with a `sid`, so they phase out
within 15 minutes of activity and never block a signed-in user.

---

## Failure behaviour

The goal is that a Redis problem is never a user problem: nobody is signed out, no request
errors, and limits keep working.

| Situation | Rate limiting | Session checks, refresh, logout, password flows |
|---|---|---|
| `REDIS_URL` not set | Per-process memory | Per-process memory |
| `REDIS_URL` set, unreachable **at startup** | Server starts after waiting up to 5 s; counts in memory | Server starts; reads and writes go to memory |
| Redis goes down **while running** | Each policy switches to its in-memory counter immediately; limits still apply, brute-force protection included | Writes go to an in-memory buffer and reads are answered from it |
| Redis comes back | A fresh `RedisStore` is attached per policy; counting moves back to Redis | The buffer is replayed into Redis with each record's remaining TTL, then cleared |
| Redis restarted with data lost | Windows restart from zero | Revocations forgotten early (prevented by AOF; see [Required Redis configuration](#required-redis-configuration)) |

What users see during an outage, verified end to end (`/auth/me` took about 3 ms with Redis
down):

- Sign-up, login, refresh, logout, "sign out other devices" and password changes all work.
- Logging out during an outage still revokes the session on that instance at once, and on every
  instance once the record is replayed.
- The 10-failures limit on passwords and OTPs still answers `429`.

**What degrades during an outage** (security, not usability):

- An instance only sees revocations it wrote itself during the outage, plus nothing from before
  it. A session that was logged out *before* Redis went down is honoured again until Redis
  returns, if someone still holds a copy of its cookies.
- With several instances, each counts rate limits on its own until Redis returns.
- Records buffered by an instance that crashes before Redis returns are lost.

These are the same guarantees as running without Redis at all, for the length of the outage.
The alternatives were worse for users: failing closed would sign everyone out or block every
login for the whole outage, and failing open would switch brute-force protection off.

**Why buffer and replay instead of only falling back.** Without the replay, a logout made during
the outage would be forgotten the moment Redis came back (reads would go to Redis, which never
heard of it). Reads therefore merge Redis's answer with the buffer until the replay lands.

**Stalls.** A Redis that is connected but slow is bounded by a 2-second `commandTimeout`; the
command then falls back to memory like any other failure.

On `SIGTERM` / `SIGINT` the server stops accepting connections, lets in-flight requests finish
(up to 10 seconds), then closes Mongo and Redis.

---

## Memory fallback

Without `REDIS_URL`:

- **Rate limits** use express-rate-limit's built-in `MemoryStore`, one per policy.
- **Revocations** use `MemoryTtlStore` (`lib/ttlStore.ts`), a `Map` of `{ value, expiresAt }`.
  Expired entries are dropped when read and by a sweep every 10 minutes (the timer is `unref`'d
  so it never keeps the process alive).

Behaviour is identical to Redis within one process. The differences:

- State is lost on every restart: rate-limit windows reset, and the tokens of logged-out sessions
  become usable again until they expire (which is how the app behaved before revocation existed).
- With more than one instance behind a load balancer, each one counts and revokes on its own,
  so effective limits multiply by the number of instances. **Use Redis for any multi-instance
  deployment.**

---

## Sizing

Every key is a few dozen bytes plus Redis's per-key overhead (about 50-90 bytes).

| Key family | Count at any time | Notes |
|---|---|---|
| Rate-limit counters | ≤ 6 × active clients in the last hour | Most clients only touch `general` |
| Rotated tokens | ≈ refreshes in the last 7 days | One per access-token expiry while active (about 4 per active hour) |
| Revoked sessions | ≈ logouts in the last 7 days | |
| Cutoffs | ≤ users who changed or reset a password in the last 7 days | |

For example, 1,000 daily active users each active for two hours a day produce about 56,000
rotation keys over a week: well under 15 MB.

---

## Inspecting Redis

```bash
redis-cli --scan --pattern 'intake:*'                          # everything the app wrote
redis-cli --scan --pattern 'intake:rl:credential-attempts:*'   # who is close to a lockout
redis-cli GET  'intake:rl:general:ip:::/56'                    # hits in the current window
redis-cli PTTL 'intake:rl:general:ip:::/56'                    # ms until the window resets
redis-cli GET  'intake:auth:revoked-session:<sid>'             # when a session was signed out
redis-cli GET  'intake:auth:rotated-token:<jti>'               # when a refresh token was exchanged
redis-cli GET  'intake:auth:sessions-revoked-at:<userId>'      # last sign-out-everywhere
```

To lift a lockout by hand, delete the counter, e.g.
`redis-cli DEL 'intake:rl:credential-attempts:user:<userId>'`.

To sign one session out by hand (its `sid` is in either token's payload):
`redis-cli SET 'intake:auth:revoked-session:<sid>' "$(date +%s)" EX 604800`.

To sign a user out everywhere by hand:
`redis-cli SET 'intake:auth:sessions-revoked-at:<userId>' "$(date +%s)" EX 604800`.

---

## Known limitations

Accepted trade-offs, each small enough not to justify the extra complexity of fixing it here:

- **Second-level timestamps.** Cutoffs compare against the JWT `iat`, which has one-second
  precision. A token minted in the same second as a sign-out-everywhere survives it; that is what
  keeps the browser that made the change signed in, but it also spares any other token minted in
  that exact second.
- **Clock skew between instances.** The cutoff is written with one instance's clock and compared
  with `iat` values from others. Skew above a second can let an older token survive, or sign out
  a token minted just after the cutoff. NTP keeps this negligible; a per-user generation counter
  would remove it at the cost of a Redis read on every sign-in.
- **The 30-second grace window can be replayed** by someone holding a copy of a token that was
  just rotated. Reuse after the window is detected; reuse inside it is not.
- **Outages weaken revocation, not availability.** While Redis is down, revocations made before
  the outage are not visible (see [Failure behaviour](#failure-behaviour)).
- **A lost refresh response can sign a user out once.** If the server rotates a refresh token but
  the browser never receives the new cookie (connection dropped mid-response) and retries more
  than 30 seconds later, reuse detection ends the session. The user signs in again.
- **Open chat streams are not cut off.** `requireAuth` runs when a request starts, so a chat
  reply already streaming finishes (60 s at most) after a logout.
- **Changing email does not sign out other devices**, and their tokens carry the old email until
  they next refresh.
- **Redis Cluster is not supported.** The revocation check `MGET`s keys that would live in
  different hash slots, and the rate-limit store is configured for a single node. A single node
  or a primary with replicas works.

---

## Design decisions

- **Denylist, not an allowlist of sessions.** Storing every live session would mean a lost Redis
  (or a memory-only restart) signs out every user. A denylist degrades gracefully: losing it only
  forgets revocations, which matches how the app behaved before.
- **Reuse detection ends the session rather than the user.** Revoking every session of the user
  on a replayed token would also be defensible, but the copied token can only belong to one
  session, so ending that one contains the theft without signing out the user's other devices.
- **Revoke by session, not by token.** One `sid` shared by the access token and the whole chain
  of refresh tokens means logout is a single `SET`, and the check on every request is a single
  `MGET`, however many times the session has refreshed.
- **Per-user cutoff instead of listing a user's tokens.** "Sign out everywhere" is one `SET`, with
  no set of token ids per user to maintain or clean up.
- **Fixed window counters.** These are what rate-limit-redis implements; at the limits used here
  (sized so a real user never sees a `429`), the burst a fixed window allows at its edge is
  harmless.
- **Degrade to memory, not fail open or closed.** See [Failure behaviour](#failure-behaviour).
- **`ioredis`** over `node-redis`: built-in command timeouts, automatic reconnects with backoff,
  and a `ready` event to re-attach stores on.
- **No Redis for Mongo-backed state** such as OTPs or chat history. Those already live in MongoDB
  and need to survive a Redis flush.

---

## Code map

| File | Role |
|---|---|
| `t-backend/src/lib/redis.ts` | Shared ioredis client, readiness (`isRedisReady`, `onRedisReady`), startup wait and config check, outage logging, `/health` status, shutdown |
| `t-backend/src/lib/fallbackRateLimitStore.ts` | Rate-limit store: Redis while ready, in-memory otherwise, re-attached on reconnect |
| `t-backend/src/lib/redisKeys.ts` | Every key name and prefix |
| `t-backend/src/lib/ttlStore.ts` | `TtlStore` interface; `MemoryTtlStore`, and `ResilientRedisTtlStore` with its outage buffer and replay |
| `t-backend/src/middleware/rateLimit.ts` | One `FallbackRateLimitStore` per policy, or the default memory store without Redis |
| `t-backend/src/lib/rateLimitPolicies.ts` | Window and limit for each policy |
| `t-backend/src/services/sessionRevocation.service.ts` | `isAccessTokenRevoked`, `consumeRefreshToken`, `revokeSession`, `revokeAllSessions` |
| `t-backend/src/controllers/auth.controller.ts` | `logout`, `refresh`, `logoutOtherDevices` |
| `t-backend/src/middleware/auth.ts` | `requireAuth`: rejects revoked access tokens before the user lookup |
| `t-backend/src/lib/cookies.ts` | Starts a new `sid` on sign-in, or keeps the current one on refresh |
| `t-backend/src/lib/jwt.ts` | Adds the `jti` claim to refresh tokens; token lifetimes |
| `t-backend/tests/sessionRevocation.test.ts` | Session, access-token, rotation-grace, reuse-detection and cutoff tests (memory store) |
| `t-frontend/src/lib/apiClient.ts` | Shared refresh on `401`; only a `401` from refresh means signed out, any other failure is surfaced as retryable |
| `t-frontend/src/contexts/AuthContext.tsx`, `components/ProtectedRoute.tsx` | A session check that fails for any reason but `401` shows a retry screen instead of the login page |
| `t-frontend/src/components/profile/SessionsPanel.tsx` | "Sign out other devices" on the profile page |
