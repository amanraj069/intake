# INTAKE

A nutrition tracker. You set one daily goal (calories plus a protein/carb/fat split, and
optionally a target weight), then log what you eat as food entries with calories, macros and
any micronutrients you care to record. Accounts are protected with email + password or Google
sign-in, email verification and OTP-based password reset.

## Architecture

```
intake/
├── t-frontend/    Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
├── t-backend/     Express + TypeScript + MongoDB/Mongoose + zod
├── API.md         Endpoint reference: params and response shapes
└── README.md
```

### Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Express 4, TypeScript, Mongoose 8 |
| Database | MongoDB |
| Validation | zod (every route body and param) |
| Auth | JWT access/refresh tokens in httpOnly cookies, bcrypt, Passport (Google OAuth) |
| Email | Resend |

### Backend layering

Each layer has one job, and business logic never lives in a route file:

```
routes/        wiring only: path -> middleware -> controller
controllers/   request/response handling, no data access
services/      business logic and persistence
models/        Mongoose schemas
schemas/       zod request schemas + the inferred input types services accept
middleware/    auth, zod validation, centralized error handling
lib/           shared helpers (jwt, cookies, email, authenticated-user lookup)
```

### Frontend layering

```
app/            routes, thin: they compose a shell, a hook and a form
components/ui/  reusable primitives (Button, Input, Card, AmountInput, SegmentedControl, ...)
components/<feature>/  feature components (GoalForm, MealEntryForm, MicronutrientRows,
                       TodayPanel, CalorieDial, WeeklyProgressPanel, TrendColumns)
components/layout/     app shell: DashboardLayout, SidebarHeader, SidebarNav,
                       SidebarProfile, ProfileMenu, BrandMark, nav definitions
components/icons.tsx   the project's inline SVG icon set
hooks/          data-fetching and list/form state (useGoal, useFoodEntries, useMealFilters,
                useDailyIntake, useDailyIntakeSeries, useFoodEntry, useCreateFoodEntry,
                useMicronutrientRows)
lib/            api client, per-domain API modules, client-side validation, formatters
types/          shared domain types
```

## Features

- **Email + password auth** - bcrypt hashing, JWT access/refresh tokens in httpOnly cookies
- **Google OAuth** - Passport.js with `passport-google-oauth20`
- **Email verification** and **OTP password reset** - sent via Resend
- **Profile and Settings are separate pages** - `/profile` presents the account (picture,
  email, provider, member since) and never asks for a credential; `/settings` is where
  credentials change, so neither page mixes presentation with security
- **OTP-gated email and password change** - both are two steps: request a 6-digit code, then
  redeem it. The email-change code goes to the *new* address (proving the user owns the inbox
  they are moving to); the password-change code goes to the address *on file*. Codes are
  stored bcrypt-hashed, expire in 10 minutes, and are discarded after 5 wrong guesses
- **Goals** - one active daily target per user: calories, protein/carb/fat, optional goal weight
- **Meal logging** - meal type, food, quantity + unit, calories, macros, and free-form
  micronutrient name/amount pairs, with backdating support
- **Meals log** - a filterable, paginated list of every entry with inline edit and a
  confirmed delete, filtered by date range and meal type
- **Dashboard overview** - a greeting that states where today stands, calories as a tick
  dial against the daily target, a macro strip with per-macro rails, and the day's energy
  split, all served by a single summary request
- **7-day progress** - a column per day against the target line for whichever measure is
  selected (calories, protein, carbs or fat), with the hovered day's figures called out above
  the chart and the week's average, days-on-target, days-logged and total beneath it
- **Profile pictures** - uploaded to Cloudinary from the profile page, with the user's
  initials as the fallback when none is set
- **Collapsible sidebar** - from `lg` up it expands to labelled navigation or retracts to a
  64px icon rail, with the choice persisted to localStorage; below that it stays a drawer
- **Dark mode** - system-preference-aware theme toggle persisted to localStorage. Light mode
  uses a warm ivory ground rather than pure white.

## Prerequisites

- **Node.js** 18+
- **MongoDB** - local instance or [free Atlas cluster](https://www.mongodb.com/cloud/atlas)
- **Google OAuth credentials** - [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Resend API key** - [resend.com/api-keys](https://resend.com/api-keys)

---

## Setup

### 1. Clone and install

```bash
# Backend
cd t-backend
cp .env.example .env
npm install

# Frontend
cd ../t-frontend
cp .env.example .env
npm install
```

### 2. Configure environment variables

#### Backend (`t-backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `9000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens - generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (use a different value) |
| `JWT_EMAIL_SECRET` | Secret for email verification/reset tokens (use a different value) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name - required for profile picture uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:9000/auth/google/callback` |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender email (default: `onboarding@resend.dev` for sandbox) |
| `FRONTEND_URL` | `http://localhost:3000` |

#### Frontend (`t-frontend/.env`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:9000` |

### 3. Database setup

No migrations or seed step is needed. Point `MONGODB_URI` at a running MongoDB and Mongoose
creates the `users`, `goals` and `foodentries` collections, along with their indexes, on first
write. For a local instance:

```bash
brew services start mongodb-community    # macOS
# or: docker run -d -p 27017:27017 --name intake-mongo mongo:7
```

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000` to **Authorized JavaScript origins**
4. Add `http://localhost:9000/auth/google/callback` to **Authorized redirect URIs**
5. Copy the Client ID and Client Secret to your backend `.env`

### 5. Set up Resend

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from [resend.com/api-keys](https://resend.com/api-keys)
3. Add it to `RESEND_API_KEY` in your backend `.env`
4. For local development, `EMAIL_FROM=onboarding@resend.dev` works with the sandbox
5. For production, verify a domain and use an address on that domain

### 6. Run both servers

```bash
# Terminal 1 - Backend
cd t-backend
npm run dev        # http://localhost:9000

# Terminal 2 - Frontend
cd t-frontend
npm run dev        # http://localhost:3000
```

Other useful commands:

```bash
cd t-backend  && npm run build && npm start   # compile to dist/ and run
cd t-backend  && npm run lint                 # eslint
cd t-frontend && npm run build && npm start   # production build and serve
cd t-frontend && npm run lint                 # eslint
```

---

## Pages

| Route | Auth | What it does |
|---|---|---|
| `/` | - | Landing page |
| `/login`, `/signup`, `/forgot-password`, `/verify-email` | - | Auth flows |
| `/profile` | yes | Account details and profile picture, read-only, plus resend verification |
| `/settings` | yes | Security (OTP-gated email and password change) and appearance (theme) |
| `/dashboard` | yes | Today's calories and macros against the active goal, plus a 7-day trend |
| `/goals` | yes | View and update the active goal. Pre-filled when one exists. |
| `/log-meal` | yes | Log a food entry, including add/remove micronutrient rows |
| `/meals` | yes | Filter, page through, edit and delete logged entries |
| `/meals/:id/edit` | yes | The meal form pre-filled with a saved entry |

## API Routes

Full parameter and response shapes are in [API.md](./API.md).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | - | Create account |
| `POST` | `/auth/login` | - | Sign in |
| `POST` | `/auth/logout` | - | Sign out (clears cookies) |
| `POST` | `/auth/refresh` | - | Refresh access token |
| `GET` | `/auth/me` | yes | Get current user |
| `GET` | `/auth/verify-email?token=` | - | Verify email |
| `POST` | `/auth/resend-verification` | yes | Resend verification email |
| `POST` | `/auth/forgot-password` | - | Request password reset OTP |
| `POST` | `/auth/reset-password` | - | Reset password with OTP |
| `PATCH` | `/auth/change-password` | yes | Change password |
| `POST` | `/auth/request-otp` | yes | Request an email/password change OTP |
| `POST` | `/auth/verify-otp` | yes | Apply a pending email/password change |
| `POST` | `/auth/avatar` | yes | Upload a profile picture (multipart, field `avatar`) |
| `DELETE` | `/auth/avatar` | yes | Remove the profile picture |
| `GET` | `/auth/google` | - | Start Google OAuth |
| `GET` | `/auth/google/callback` | - | Google OAuth callback |
| `GET` | `/api/goals` | yes | Fetch the current user's goal (`null` if unset) |
| `POST` | `/api/goals` | yes | Create or overwrite the current user's goal |
| `GET` | `/api/food-entries` | yes | List entries: date range, meal type, paginated |
| `GET` | `/api/food-entries/summary` | yes | One day's totals plus the active goal |
| `GET` | `/api/food-entries/series` | yes | Day-by-day totals across a range, plus the active goal |
| `GET` | `/api/food-entries/:id` | yes | Fetch one entry the user owns |
| `POST` | `/api/food-entries` | yes | Create a food entry |
| `PATCH` | `/api/food-entries/:id` | yes | Edit an entry the user owns |
| `DELETE` | `/api/food-entries/:id` | yes | Delete an entry the user owns |

## Data Model

### `User`

```
email:          string (unique, required)
password:       string (optional - only for local auth)
emailVerified:  boolean (default: false)
authProvider:   'local' | 'google'
googleId:       string (optional, sparse unique index)
otpCode, otpExpiresAt, otpPurpose, otpAttempts, pendingEmail:  transient OTP state
createdAt:      Date
```

### `Goal`

```
userId:              ObjectId -> User (required, unique)
dailyCalorieTarget:  number (required)
proteinTargetG:      number (required)
carbTargetG:         number (required)
fatTargetG:          number (required)
weightGoalKg:        number (optional)
createdAt, updatedAt: Date
```

### `FoodEntry`

```
userId:        ObjectId -> User (required, indexed)
mealType:      'breakfast' | 'lunch' | 'dinner' | 'snack' (required)
foodName:      string (required)
quantity:      number (required)
quantityUnit:  string (required, default 'g')
calories:      number (required)
macros:        { proteinG, carbG, fatG }  (all required)
micros:        Map<string, number>  (open-ended nutrient name -> amount)
date:          Date (required) - the day the food was eaten
source:        'manual' | 'ai-image' (default 'manual')
createdAt, updatedAt: Date
```

Compound index on `{ userId, date }` for "what did I eat on this day" reads, which also
serves the date-range list query and the daily summary aggregation.

---

## Assumptions

Decisions made where the spec left room for interpretation:

- **Profile and Settings are separate pages, split by what they do to the account.**
  `/profile` presents identity and never asks for a credential; `/settings` is the only place
  a credential changes. The sidebar account menu lists them as two destinations rather than
  one combined "Profile Settings" entry.
- **A password change is gated by an emailed code, not by the current password.** The signed-in
  user supplies only the new password, and the code sent to the address on file is the proof of
  identity. This lets someone who is signed in but has forgotten their password still rotate
  it. `PATCH /auth/change-password`, which takes the current password instead, is still
  implemented and documented but is not what the UI uses.
- **An email-change code is sent to the new address, not the current one.** The new address is
  the one whose ownership is unproven, so delivering a code there and having it typed back is
  what proves control. A verified change therefore also sets `emailVerified: true`, and the
  proposed address is parked in `pendingEmail` until then - nothing is written to `email` until
  the code comes back.
- **Google accounts cannot change their email or password here.** They have no local password,
  and their address belongs to Google, so both would desync rather than take effect. The
  settings page says so in place of the forms instead of offering controls the server would
  reject. Letting a Google user *set* a local password would be a product decision, not a bug
  fix, so it is deliberately not done.
- **OTP codes are hashed, expiring and rate-limited.** They are generated from the CSPRNG,
  stored bcrypt-hashed (a database dump yields no live codes), expire 10 minutes after issue,
  and are discarded after 5 wrong guesses so a six-digit secret cannot be brute-forced inside
  its window. Requesting a new code always replaces any code in flight.
- **The code is persisted before the email is sent.** If the mail provider refuses the message
  the endpoint returns `502`, but the stored code stays valid, so a retry re-sends rather than
  stranding the user mid-flow.
- **Auth cookies are reissued after a verified change.** The access token carries the email, so
  an email change would otherwise leave the session presenting the old address.
- **Goals are not versioned.** A user has exactly one active goal, enforced by a unique index
  on `Goal.userId`. `POST /api/goals` is an upsert that overwrites in place, so there is no
  history of past targets. If historical goals are needed later, this becomes an append-only
  collection with an `effectiveFrom` date; nothing in the current shape blocks that.
- **Omitting `weightGoalKg` clears it.** Because the goal is a whole-document replace rather
  than a patch, leaving the optional weight blank in the form unsets any saved value instead of
  silently preserving a stale one.
- **Quantity units are free text, not an enum.** `quantityUnit` is a string (`g`, `ml`,
  `serving`, `slice`). No unit conversion is performed: `calories` and `macros` are the totals
  for the stated `quantity`, not per-100g values.
- **Micronutrients are an open map, not fixed fields.** `micros` is a Mongoose `Map` of nutrient
  name to amount, because which micros are known varies per food and per data source. Nutrient
  names are free text (up to 50 per entry) and are stored verbatim, so `vitaminC` and
  `Vitamin C` are different keys. Duplicate names within a single submission are rejected
  client-side, compared case-insensitively.
- **Micronutrient amounts are unitless numbers.** The unit is implied by the nutrient name.
  Storing an explicit unit per nutrient would be the next refinement.
- **A `PATCH` that supplies `micros` replaces the whole map** rather than merging, so removing
  a row in the UI actually deletes that nutrient. Supplying `macros` likewise requires the
  complete object; there is no partial macro update.
- **`date` is separate from `createdAt`** so entries can be backdated. The meal form defaults
  `date` to today in the viewer's timezone, set after mount to avoid a server/client hydration
  mismatch. A date-only string such as `2026-09-10` is stored as UTC midnight.
- **`source` already accepts `ai-image`** even though only manual entry exists in the UI. The
  frontend always sends `manual`; the enum is there so image-derived entries need no migration.
- **The error envelope is `{ success, message, errors? }`**, matching the shape the existing
  auth routes and the frontend `ApiError` already use, rather than introducing a second
  `{ error: { message, code } }` shape alongside it. HTTP status carries the code, `errors` is
  a field-keyed map of validation messages, and a stack trace is never returned.
- **A missing goal is a success, not a 404.** `GET /api/goals` returns `{ goal: null }` so the
  frontend can render an empty form without treating first-time use as an error.
- **Ownership failures distinguish 404 from 403.** A non-existent entry is `404`; an entry that
  exists but belongs to someone else is `403`. A malformed id fails zod validation with `400`
  before reaching the database.
- **Day boundaries are compared in UTC.** The client sends a bare `YYYY-MM-DD`, which is
  stored as midnight UTC, so the list's range filter and the daily summary both bound the day
  as `[midnight UTC, next midnight UTC)`. Every date shown in the UI is likewise formatted in
  UTC, otherwise a viewer west of Greenwich would see the previous day against each entry.
- **The default list range is the last 7 days, ending today.** Each bound falls back
  independently: `endDate` defaults to today and `startDate` to six days before whichever
  `endDate` applies, so supplying only one bound still yields a sensible window.
- **The dashboard's trend window is the trailing 7 days, ending today in the viewer's own
  timezone.** The range is fixed when the panel mounts, so a tab left open overnight keeps the
  window it loaded with rather than silently shifting at midnight. `GET
  /api/food-entries/series` caps a range at 92 days, which bounds the response for any future
  month or quarter view without a second endpoint.
- **"On target" is a band, not a point.** A day counts as on target when it lands between 90%
  and 110% of that day's target, since hitting a calorie or macro figure exactly is not
  realistic. Anything above 110% reads as over and is the only thing the accent colour marks.
- **Trend averages divide by every day in the range, not only the logged ones.** Seven days
  with two logged is an average over seven, so the figure is comparable with the daily target
  rather than flattering a sparse week. "Days logged" is reported beside it so the gap is
  visible.
- **The dashboard measures the whole week against the current goal.** Goals are not versioned,
  so a past day is compared with whatever target is active now, not the one that was set then.
- **The energy split uses the standard 4/4/9 kcal-per-gram factors.** Each share is rounded
  independently, so the three can sum to 99 or 101; the exact grams sit beside them.
- **A day with nothing logged draws a stub mark rather than no mark at all**, so an empty day
  reads as a measured zero instead of missing data.
- **The trend readout is a fixed slot, not a floating tooltip.** Hovering or tapping a column
  fills one line above the chart, which cannot be clipped at a panel edge and works on touch,
  where there is no hover at all.
- **The list sort is given a total order.** Entries share a timestamp whenever they fall on the
  same day, so `date` descending is broken by `createdAt` and then `_id`. Without that, the
  same record could surface on two pages of a paginated walk, or on none.
- **Pagination is offset-based**, which is what `page`/`limit` in the spec implies. It is the
  right call at this scale; a cursor would be the change if an account ever holds enough
  entries for deep offsets to hurt.
- **An empty page still reports `totalPages: 1`.** The envelope is always renderable, so no
  client has to special-case "page 1 of 0".
- **Deleting reloads the current page** rather than removing the row locally, so `total` and
  `totalPages` stay truthful and the vacated slot fills from the next page.
- **The two date filters clamp each other.** Picking a start after the current end drags the
  end along with it, so the UI cannot request the range the API would reject, and the user
  never has to read an error to fix it.
- **Editing is a route, not a modal.** `/meals/:id/edit` re-mounts the same `MealEntryForm`
  used for logging, pre-filled from `GET /api/food-entries/:id`. That endpoint is not in the
  stage spec but completes the REST resource and makes the edit view deep-linkable and
  refresh-safe, which a modal fed from list state would not be.
- **Profile pictures are keyed on the user id in Cloudinary.** Each avatar is uploaded to
  `intake/avatars/<userId>` with `overwrite: true`, so a user has at most one stored asset and
  a re-upload replaces the previous one with no separate cleanup step. A square 512x512
  face-aware crop is applied at upload time, so every avatar slot in the UI renders the stored
  URL directly with no per-view transformation.
- **Missing Cloudinary configuration degrades rather than crashes.** Without
  `CLOUDINARY_CLOUD_NAME` the avatar endpoints return `503` with a plain message; nothing else
  in the API depends on Cloudinary.
- **Initials are derived from the email, since accounts have no name field.** The local part is
  split on `.`, `-`, `_` and `+`, so `ada.lovelace@...` shows `AL` and a single-word local part
  falls back to its first two letters. If real first/last name fields are added later, only
  `t-frontend/src/lib/userIdentity.ts` changes.
- **Removing an avatar clears the profile even if Cloudinary's delete fails.** The user asked
  for the picture to be gone, so the local record is cleared first and a failed remote destroy
  is logged rather than surfaced, leaving at most an orphaned asset.
- **Every user payload goes through one serializer.** `toUserResponse` whitelists the fields a
  client may see, which keeps `password`, OTP state and `pendingEmail` off responses by
  construction rather than by each handler remembering to omit them.
- **Retracting the sidebar is a desktop-only idea.** Below `lg` the sidebar is already a drawer
  that is hidden until summoned, so it always opens with labels and the rail preference is
  neither read nor written at that width.
- **Account actions live behind one menu.** The sidebar's three-dot trigger owns Profile
  Settings, the theme switch and Log Out, so the sidebar header is free to carry the
  expand/retract control and there is no second log-out affordance to keep in sync.
- **Client-side validation mirrors the backend zod rules by hand.** The frontend has no zod
  dependency, so the bounds live in `t-frontend/src/lib/validation/amount.ts` and must be kept
  in sync with `t-backend/src/schemas/`. The backend remains the authority; the client copy
  only exists to give field-level feedback without a round trip.

## Known gaps

- No automated test suite. The API was verified end to end manually: register, goal upsert,
  entry create/read/patch/delete, a 29-entry paginated walk at `limit=6` confirming every
  record is visited exactly once, date-range and meal-type filters, the daily summary with and
  without a goal, and the 400/401/403/404 paths. The OTP-gated account changes were verified the
  same way against a throwaway account: a correct code commits the change and the new password
  logs in while the old one stops working, a replayed code is rejected, an expired code is
  rejected, a new password identical to the current one is rejected, the sixth wrong guess
  locks the code out and discards it, and a verified email change promotes `pendingEmail` and
  sets `emailVerified`.
- The meals list filters on the server on every change. There is no debounce, which is fine for
  native date and select inputs but would need one if a free-text search were added.
- `source: 'ai-image'` is accepted by the API but nothing in the UI produces it yet.
