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
components/<feature>/  feature components (GoalForm, MealEntryForm, MicronutrientRows)
hooks/          data-fetching and form state (useGoal, useCreateFoodEntry, useMicronutrientRows)
lib/            api client, per-domain API modules, client-side validation, formatters
types/          shared domain types
```

## Features

- **Email + password auth** - bcrypt hashing, JWT access/refresh tokens in httpOnly cookies
- **Google OAuth** - Passport.js with `passport-google-oauth20`
- **Email verification** and **OTP password reset** - sent via Resend
- **Goals** - one active daily target per user: calories, protein/carb/fat, optional goal weight
- **Meal logging** - meal type, food, quantity + unit, calories, macros, and free-form
  micronutrient name/amount pairs, with backdating support
- **Dark mode** - system-preference-aware theme toggle persisted to localStorage

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
| `/profile` | yes | Account details, change email/password, resend verification |
| `/goals` | yes | View and update the active goal. Pre-filled when one exists. |
| `/meals/new` | yes | Log a food entry, including add/remove micronutrient rows |

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
| `GET` | `/auth/google` | - | Start Google OAuth |
| `GET` | `/auth/google/callback` | - | Google OAuth callback |
| `GET` | `/api/goals` | yes | Fetch the current user's goal (`null` if unset) |
| `POST` | `/api/goals` | yes | Create or overwrite the current user's goal |
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
otpCode, otpExpiresAt, otpPurpose, pendingEmail:  transient OTP state
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

Compound index on `{ userId, date }` for "what did I eat on this day" reads.

---

## Assumptions

Decisions made where the spec left room for interpretation:

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
- **Client-side validation mirrors the backend zod rules by hand.** The frontend has no zod
  dependency, so the bounds live in `t-frontend/src/lib/validation/amount.ts` and must be kept
  in sync with `t-backend/src/schemas/`. The backend remains the authority; the client copy
  only exists to give field-level feedback without a round trip.

## Known gaps

- There is no list/read endpoint for food entries yet, so `/meals/new` confirms a saved entry
  inline but there is no daily log view. `PATCH` and `DELETE` are implemented and tested but
  are not yet wired to a UI.
- No automated test suite. The API was verified end to end manually (register, goal upsert,
  entry create/patch/delete, and the 401/403/404/400 paths).
