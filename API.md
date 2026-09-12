# API Reference

Base URL: `http://localhost:9000`

All responses share one envelope:

```jsonc
// success
{ "success": true, "message": "...", "data": { /* endpoint-specific */ } }

// failure
{ "success": false, "message": "...", "errors": { "fieldName": ["..."] } }
```

`errors` is present only on validation failures (HTTP 400), keyed by field name.

List endpoints add pagination metadata beside `data`, which holds the page of records:

```jsonc
{ "success": true, "message": "...", "data": [ /* records */ ],
  "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
```

This envelope is the standard for every list endpoint in the app. `page` and `limit` default
to `1` and `20`; `limit` is capped at `100`. An empty result still reports `totalPages: 1`, so
a client never has to render "page 1 of 0".
Authenticated routes read the `access_token` httpOnly cookie and return `401` when it is
missing, expired or invalid. Every request body is validated with zod before any business
logic runs, so a handler never sees an unchecked payload and a stack trace is never returned.

---

## Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | - | Create a local account. Body: `{ email, password }` (password 8-128 chars). Returns `{ user }` and sets auth cookies. |
| `POST` | `/auth/login` | - | Sign in. Body: `{ email, password }`. Returns `{ user }` and sets auth cookies. |
| `POST` | `/auth/logout` | - | Clear auth cookies. No body. |
| `POST` | `/auth/refresh` | - | Mint a new access token from the refresh cookie. |
| `GET` | `/auth/me` | yes | Current user. Returns `{ user }`. |
| `GET` | `/auth/verify-email?token=` | - | Verify an email address from the link in the verification mail. |
| `POST` | `/auth/resend-verification` | yes | Re-send the verification email. |
| `POST` | `/auth/forgot-password` | - | Body: `{ email }`. Emails a 6-digit OTP. |
| `POST` | `/auth/reset-password` | - | Body: `{ email, otp, newPassword }`. |
| `PATCH` | `/auth/change-password` | yes | Body: `{ currentPassword, newPassword }`. Rotates the password using the old one instead of an OTP. |
| `POST` | `/auth/request-otp` | yes | Start an OTP-gated account change. See below. |
| `POST` | `/auth/verify-otp` | yes | Redeem the code and commit the change. See below. |
| `POST` | `/auth/avatar` | yes | Upload a profile picture. `multipart/form-data` with one file field `avatar` (JPEG/PNG/WebP, max 5MB). Returns `{ user }`. |
| `DELETE` | `/auth/avatar` | yes | Remove the profile picture and destroy the stored asset. Returns `{ user }`. |
| `GET` | `/auth/google` | - | Start the Google OAuth redirect. |
| `GET` | `/auth/google/callback` | - | OAuth callback. Sets cookies and redirects to the frontend. |

Every endpoint that returns `{ user }` returns the same shape:

```json
{
  "id": "6aa50aeb...",
  "email": "ada@example.com",
  "emailVerified": true,
  "authProvider": "local",
  "avatarUrl": "https://res.cloudinary.com/.../intake/avatars/6aa50aeb....jpg",
  "createdAt": "2026-09-12T08:18:52.000Z"
}
```

`avatarUrl` is `null` when no picture is set. Avatar-specific failures: `400` no file, wrong
type, oversized, or nothing to remove; `502` Cloudinary rejected the upload; `503` Cloudinary
is not configured on the server.

### OTP-gated account changes

Changing the sign-in email or the password takes two requests: ask for a code, then redeem
it. Nothing is written until the code comes back, and each request replaces any code already
in flight - which is also how a user recovers from one that was lost or has expired.

#### `POST /auth/request-otp` (authenticated)

The body is a discriminated union on `purpose`, so a payload the purpose does not accept is
rejected by validation rather than ignored:

```jsonc
{ "purpose": "change-email", "newEmail": "new@example.com" }  // newEmail required
{ "purpose": "change-password" }                              // no other fields
```

The code goes to the **new** address for `change-email` - that is the address whose ownership
is unproven - and to the address **on file** for `change-password`. The response names the
destination so the client can show it:

```json
{ "success": true, "message": "Verification code sent to new@example.com",
  "data": { "sentTo": "new@example.com" } }
```

Failures: `400` invalid payload, an address that is already the account's own, or a Google
account (its credentials belong to Google); `409` the address is already in use; `502` the
mail provider refused the message - the code is stored either way, so a retry re-sends.

#### `POST /auth/verify-otp` (authenticated)

```jsonc
{ "purpose": "change-email", "otp": "123456" }
{ "purpose": "change-password", "otp": "123456", "newPassword": "..." }  // 8-128 chars
```

On success the change is committed, the code is discarded, auth cookies are reissued (the
access token carries the email, so an email change would otherwise leave a stale session),
and the updated `{ user }` is returned. A verified `change-email` also sets
`emailVerified: true`: delivering the code to that inbox is itself proof of control.

Failures: `400` no code pending, an expired code, a wrong code, or a new password identical
to the current one; `409` the address was claimed by someone else while the code was in
flight; `429` more than 5 wrong guesses, after which the code is discarded and a new one must
be requested. Codes expire 10 minutes after they are issued and are stored bcrypt-hashed, so
a database dump never yields a live code.

---

## Goals

A user has exactly one active goal. `POST` is an upsert, not an append.

### `GET /api/goals` (authenticated)

Fetch the current user's goal.

- Params: none.
- Response `200`: `{ data: { goal: Goal | null } }`. `goal` is `null` when the user has not
  set one yet. This is a success, not an error, so the frontend can show an empty form.

### `POST /api/goals` (authenticated)

Create the current user's goal, or overwrite it if one exists.

- Body:

  | Field | Type | Required | Bounds |
  |---|---|---|---|
  | `dailyCalorieTarget` | number | yes | 0 - 20000 |
  | `proteinTargetG` | number | yes | 0 - 2000 |
  | `carbTargetG` | number | yes | 0 - 2000 |
  | `fatTargetG` | number | yes | 0 - 2000 |
  | `weightGoalKg` | number | no | 0 - 1000 |

- Response `200`: `{ data: { goal: Goal } }`.
- Omitting `weightGoalKg` clears any previously saved value rather than keeping the old one.

```jsonc
// Goal
{
  "_id": "6aa4e022...",
  "userId": "6aa4e022...",
  "dailyCalorieTarget": 2600,
  "proteinTargetG": 190,
  "carbTargetG": 250,
  "fatTargetG": 75,
  "weightGoalKg": 76.5,   // absent when not set
  "createdAt": "2026-09-12T05:16:18.093Z",
  "updatedAt": "2026-09-12T05:16:18.104Z"
}
```

---

## Food entries

### `POST /api/food-entries` (authenticated)

Log a food entry for the current user.

- Body:

  | Field | Type | Required | Notes |
  |---|---|---|---|
  | `mealType` | `"breakfast" \| "lunch" \| "dinner" \| "snack"` | yes | |
  | `foodName` | string | yes | 1 - 200 chars |
  | `quantity` | number | yes | 0 - 100000 |
  | `quantityUnit` | string | yes | 1 - 20 chars, e.g. `g`, `ml`, `serving` |
  | `calories` | number | yes | 0 - 20000 |
  | `macros` | `{ proteinG, carbG, fatG }` | yes | each 0 - 2000 grams |
  | `micros` | `{ [nutrientName]: number }` | no | open-ended map, up to 50 entries |
  | `date` | date string | yes | the day the food was eaten, e.g. `2026-09-10` |
  | `source` | `"manual" \| "ai-image"` | no | defaults to `manual` |

- Response `201`: `{ data: { foodEntry: FoodEntry } }`.

```jsonc
// FoodEntry
{
  "_id": "6aa4e030...",
  "userId": "6aa4e022...",
  "mealType": "breakfast",
  "foodName": "Greek yogurt with berries",
  "quantity": 250,
  "quantityUnit": "g",
  "calories": 310,
  "macros": { "proteinG": 22.5, "carbG": 31, "fatG": 9 },
  "micros": { "vitaminC": 12, "iron": 3, "calcium": 280 },
  "date": "2026-09-10T00:00:00.000Z",
  "source": "manual",
  "createdAt": "2026-09-12T05:16:32.138Z",
  "updatedAt": "2026-09-12T05:16:32.138Z"
}
```

### `GET /api/food-entries` (authenticated)

List the current user's entries, newest day first.

- Query params (all optional):

  | Param | Type | Default | Notes |
  |---|---|---|---|
  | `startDate` | `YYYY-MM-DD` | 6 days before `endDate` | inclusive lower bound |
  | `endDate` | `YYYY-MM-DD` | today (UTC) | inclusive upper bound |
  | `mealType` | `"breakfast" \| "lunch" \| "dinner" \| "snack"` | all | exact match |
  | `page` | integer >= 1 | `1` | |
  | `limit` | integer 1 - 100 | `20` | page size |

- Response `200`: the pagination envelope above, with `data` holding `FoodEntry[]`.
- Omitting both dates therefore covers the last 7 days. Each bound falls back independently,
  so `?startDate=2026-09-01` alone means "1 September through today".
- `400` when a date is not a real calendar day (`2026-02-31` is rejected), when `startDate` is
  after `endDate`, or when `page`/`limit` fall outside their bounds.
- Sorted by `date` descending, then `createdAt` and `_id` descending. Entries logged for the
  same day share a timestamp, so those tie-breakers give the sort a total order: without them a
  record could appear on two pages, or on none.

### `GET /api/food-entries/summary` (authenticated)

One day's totals next to the current user's goal, so an "actual vs target" widget renders
without a second round trip.

- Query params: `date` (`YYYY-MM-DD`, optional, defaults to today in UTC).
- Response `200`:

```jsonc
{
  "data": {
    "date": "2026-09-12",
    "totals": { "calories": 1195, "proteinG": 67.5, "carbG": 116, "fatG": 41.5, "entryCount": 5 },
    "goal": { /* Goal, or null when the user has not set one */ }
  }
}
```

- Totals are summed across every entry on that day and rounded to one decimal place. A day with
  no entries returns zeros rather than a `404`.

### `GET /api/food-entries/series` (authenticated)

Day-by-day totals across a date range with the current user's goal, for the dashboard's
trend view. Every calendar day in the range is present, so the client plots the series
without reconstructing missing dates.

- Query params: `startDate` and `endDate` (both `YYYY-MM-DD`, both required).
- Response `200`:

```jsonc
{
  "data": {
    "startDate": "2026-09-06",
    "endDate": "2026-09-12",
    "days": [
      { "date": "2026-09-06", "totals": { "calories": 0, "proteinG": 0, "carbG": 0, "fatG": 0, "entryCount": 0 } },
      { "date": "2026-09-12", "totals": { "calories": 420, "proteinG": 38, "carbG": 18, "fatG": 21, "entryCount": 1 } }
    ],
    "goal": { /* Goal, or null when the user has not set one */ }
  }
}
```

- Days with no entries return zeroed totals rather than being omitted.
- `400` when `startDate` is after `endDate`, or when the range spans more than 92 days.

### `GET /api/food-entries/:id` (authenticated)

Fetch one of the current user's entries, used to open the edit form pre-filled.

- Params: `id` - a 24-character Mongo ObjectId.
- Response `200`: `{ data: { foodEntry: FoodEntry } }`.
- `404` if no entry has that id, `403` if it belongs to another user.

### `PATCH /api/food-entries/:id` (authenticated)

Edit one of the current user's entries.

- Params: `id` - a 24-character Mongo ObjectId. A malformed id fails validation with `400`.
- Body: any subset of the create fields, and at least one of them. `macros`, when supplied,
  must be complete. A supplied `micros` object replaces the whole map, so a nutrient removed
  in the UI actually disappears.
- Response `200`: `{ data: { foodEntry: FoodEntry } }`.
- `404` if no entry has that id, `403` if it belongs to another user.

### `DELETE /api/food-entries/:id` (authenticated)

Delete one of the current user's entries.

- Params: `id` - a 24-character Mongo ObjectId.
- Response `200`: `{ success: true, message: "Food entry deleted successfully" }`.
- `404` if no entry has that id, `403` if it belongs to another user.
