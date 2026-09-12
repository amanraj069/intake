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
| `PATCH` | `/auth/change-password` | yes | Body: `{ currentPassword, newPassword }`. |
| `POST` | `/auth/request-otp` | yes | Body: `{ purpose, newEmail? }`. Emails an OTP for an email or password change. |
| `POST` | `/auth/verify-otp` | yes | Body: `{ purpose, otp, newPassword? }`. Applies the pending change. |
| `GET` | `/auth/google` | - | Start the Google OAuth redirect. |
| `GET` | `/auth/google/callback` | - | OAuth callback. Sets cookies and redirects to the frontend. |

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
