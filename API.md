# API Reference

Base URL: `http://localhost:9000`

All responses share one envelope:

```jsonc
// success
{ "success": true, "message": "...", "data": { /* endpoint-specific */ } }

// failure
{ "success": false, "message": "...", "errors": { "fieldName": ["..."] } }
```

`errors` is present only on validation failures (HTTP 400), keyed by field name. Failures a
client may handle differently also carry a stable `code`, e.g.
`{ "success": false, "message": "...", "code": "NO_FOOD_DETECTED" }`.

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
| `POST` | `/auth/check-email` | - | Signup step one. Body: `{ email }`. Returns `{ available: boolean }`. |
| `POST` | `/auth/register` | - | Create a local account. Body: `{ email, firstName, lastName, password }` (names 1-50 chars, password 8-128 chars). Mails a 6-digit signup code. Returns `{ user, verificationCodeSent }` and sets auth cookies; `verificationCodeSent: false` means the account exists but the email failed, so the client should offer a resend. `409` if the email is taken. |
| `POST` | `/auth/signup/resend-otp` | yes | Mail a fresh signup code to the signed-in, unverified user. Returns `{ sentTo }`. `400` if already verified, `502` if mail delivery failed. |
| `POST` | `/auth/signup/verify-otp` | yes | Body: `{ otp }`. Marks the email verified. Returns `{ user }`. `400` wrong/expired code, `429` after 5 wrong guesses. |
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
| `GET` | `/auth/google/callback` | - | OAuth callback. Stores the Google first/last name, sets cookies, and redirects to `/onboarding` (no body profile yet) or `/dashboard`. |

Every endpoint that returns `{ user }` returns the same shape:

```json
{
  "id": "6aa50aeb...",
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "emailVerified": true,
  "authProvider": "local",
  "avatarUrl": "https://res.cloudinary.com/.../intake/avatars/6aa50aeb....jpg",
  "bodyProfile": {
    "weightKg": 64, "heightCm": 165, "goalWeightKg": 60,
    "age": 30, "sex": "female", "activityLevel": "light"
  },
  "onboardingCompleted": true,
  "createdAt": "2026-09-12T08:18:52.000Z"
}
```

`avatarUrl` is `null` when no picture is set. `firstName`/`lastName` are `null` for accounts created
before names were collected, and `bodyProfile` is `null` until onboarding is completed. Avatar-specific failures: `400` no file, wrong
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

## Onboarding

Both endpoints require authentication. The body profile is validated as: `weightKg` and
`goalWeightKg` 30-300, `heightCm` 120-230, `age` a whole number 16-100, `sex` `male | female`,
`activityLevel` `sedentary | light | moderate | active | very-active`.

### `POST /api/onboarding/plan` (authenticated)

Calculates BMI and recommended daily targets. Saves nothing.

Body: the body profile, e.g. `{ "weightKg": 64, "heightCm": 165, "goalWeightKg": 60, "age": 30, "sex": "female", "activityLevel": "light" }`.

Response `data.plan`:

```json
{
  "bmi": 23.5,
  "bmiCategory": "healthy",
  "goalBmi": 22,
  "direction": "lose",
  "targets": { "dailyCalorieTarget": 1370, "proteinTargetG": 128, "carbTargetG": 129, "fatTargetG": 38 },
  "rationale": "Two short sentences explaining the plan.",
  "source": "ai"
}
```

`bmiCategory` is `underweight | healthy | overweight | obese`; `direction` is
`lose | maintain | gain`. `source` is `formula` when Gemini could not be reached in time or its
answer failed validation, in which case the targets come from the Mifflin-St Jeor equation. An
AI outage therefore never fails this endpoint.

### `POST /api/onboarding/complete` (authenticated)

Body: `{ "profile": <body profile>, "targets": { dailyCalorieTarget, proteinTargetG, carbTargetG, fatTargetG } }`.
Saves the body profile, overwrites the user's goal with `targets` (and `weightGoalKg` set to the
goal weight), marks onboarding complete, and returns `{ user }`. Safe to call again to recalculate.

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

---

## AI

### `POST /api/ai/extract-nutrition` (authenticated)

Reads a draft food entry from a food photo or a nutrition label. **Saves nothing**: the client
shows the draft for review and saves it through `POST /api/food-entries`.

- Body: `multipart/form-data` with
  - `image` (required) - one JPEG, PNG, WebP or HEIC file, 8MB max. The file's bytes are checked,
    not just its declared type.
  - `description` (optional) - up to 200 characters, e.g. `"half of this pizza"`. Used as a hint;
    printed label values take priority.
- Response `200` `data`:

```json
{
  "extraction": {
    "foodName": "Crunchy Cereal",
    "quantity": 1,
    "quantityUnit": "55g",
    "calories": 230,
    "macros": { "proteinG": 3, "carbG": 37, "fatG": 8 },
    "micros": {
      "Vitamin D": { "amount": 0.002, "unit": "mg" },
      "Calcium": { "amount": 260, "unit": "mg" },
      "Iron": { "amount": 8, "unit": "mg" }
    }
  },
  "analysis": {
    "imageKind": "nutrition-label",
    "confidence": {
      "score": 76,
      "level": "medium",
      "levelSteps": [
        "Start at High: nutrition label with printed values",
        "Down to Medium: unsure what the food is (food identity 50, below 60)"
      ],
      "factors": [
        { "key": "foodIdentity", "label": "Food identity", "score": 50, "weight": 0.2, "reason": "No product name; the profile suggests a cereal." },
        { "key": "portionSize", "label": "Portion size", "score": 80, "weight": 0.25, "reason": "One 55 g serving as printed." },
        { "key": "nutrientValues", "label": "Nutrient values", "score": 100, "weight": 0.45, "reason": "Printed clearly on the label." },
        { "key": "imageQuality", "label": "Image quality", "score": 100, "weight": 0.1, "reason": "Sharp and fully in frame." }
      ],
      "adjustments": [
        "Food identity capped at 50: no product name is visible on the label.",
        "Portion size capped at 80: a label gives one serving, not how much was eaten."
      ]
    },
    "notes": "Values read from the printed panel for one 55 g serving.",
    "warnings": []
  }
}
```

`extraction` has exactly the nutrition fields of a food entry and always satisfies the create
endpoint's limits. `quantityUnit` is grams per serving; `calories` and `macros` are totals for
`quantity` servings; micronutrient names come from the app's catalog, amounts are in mg, and only the significant
ones are included (at most 6, most important first).
`imageKind` is `nutrition-label | meal`. `confidence.score` is 0-95, computed on the server
from the four factor scores (weighted mean blended with the weakest factor, then fixed caps and
penalties listed in `adjustments`). `level` is `high | medium | low`, set by a rule ladder
(start from the image type, up for a described amount, down for disagreeing calories or an
unsure food or portion, never above what the score supports) whose applied rules are listed in
order in `levelSteps`. See the README assumptions for the full rules. `warnings`
lists things to double-check (an estimated portion, calories that disagree with the macros).

Errors, each with a `code`:

| Status | `code` | When |
|---|---|---|
| `400` | `IMAGE_REQUIRED` | No `image` field |
| `400` | `UNSUPPORTED_IMAGE_TYPE` | Declared type is not JPEG, PNG, WebP or HEIC |
| `400` | `UPLOAD_UNREADABLE` | Malformed multipart body or unexpected field |
| `400` | - | `description` over 200 characters (validation `errors`) |
| `401` | - | Not signed in |
| `413` | `IMAGE_TOO_LARGE` | File over 8MB |
| `422` | `IMAGE_UNREADABLE` | The bytes are not an image |
| `422` | `IMAGE_UNPROCESSABLE` | The AI provider could not decode the image |
| `422` | `IMAGE_UNCLEAR` | Too blurry, dark or cropped to read; `message` is the model's reason |
| `422` | `NO_FOOD_DETECTED` | No food, drink or label in the photo; `message` is the model's reason |
| `502` | `AI_BAD_RESPONSE` | The model's answer was incomplete or outside entry limits |
| `503` | `AI_UNAVAILABLE` | No Gemini key or model answered within 45 seconds, or no keys are configured |

---

## Reports

All four require authentication and accept optional `startDate` and `endDate` query params
(`YYYY-MM-DD`, validated as real dates). With neither, the range is the last 7 days ending today
(the last 28 days for `macros?groupBy=week`). Days are UTC calendar days, matching how entries
store `date`. Totals are rounded to one decimal; micronutrients to three.

### `GET /api/reports/weekly-calories`

- Response `data`: `[{ "date": "2026-09-08", "totalCalories": 950.4 }, ...]` - one element per
  day in the range, in order, with `0` for days without entries.

### `GET /api/reports/macros`

- Query: also `groupBy` - `day` (default) or `week`.
- Response `data`: `[{ "period": "2026-09-08", "proteinG": 55.8, "carbG": 95.3, "fatG": 32.3 }, ...]`.
  Daily periods cover every day in the range (zero-filled). Weekly periods are ISO weeks such as
  `"2026-W37"`, and only weeks with entries are returned.

### `GET /api/reports/micros`

- Response `data`: `[{ "nutrient": "Calcium", "amount": 610.5, "unit": "mg" }, ...]` - each
  nutrient summed across the range, sorted by name. Empty when no entry has micronutrients.

### `GET /api/reports/goal-comparison`

- Response `data`: `[{ "date": "2026-09-08", "actualCalories": 950.4, "targetCalories": 2000 }, ...]`
  - one element per day (zero-filled). `targetCalories` is the current goal's
  `dailyCalorieTarget`, or `null` on every day if no goal is set.
