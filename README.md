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
| AI | Gemini (photo extraction, onboarding plans, PDF import, chat assistant via native function calling) |
| PDF text | pdf-parse |

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
                       TodayPanel, CalorieDial, WeeklyProgressPanel, TrendColumns,
                       ChatThread, PendingActionCard)
components/layout/     app shell: DashboardLayout, SidebarHeader, SidebarNav,
                       SidebarProfile, ProfileMenu, BrandMark, nav definitions
components/icons.tsx   the project's inline SVG icon set
hooks/          data-fetching and list/form state (useGoal, useFoodEntries, useMealFilters,
                useDailyIntake, useDailyIntakeSeries, useFoodEntry, useCreateFoodEntry,
                useMicronutrientRows, useChatHistory, useChatThread)
lib/            api client, per-domain API modules, client-side validation, formatters
types/          shared domain types
```

## Features

- **Three-step email signup** - email first (checked for availability), then first name, last
  name and a confirmed password, then a 6-digit code mailed to the address. Google sign-in
  takes the name from the Google profile instead
- **AI onboarding** - after first sign-in (either method) the user enters height, weight, goal
  weight, age, sex and activity level. The backend calculates BMI and asks Gemini for daily
  calorie and macro targets, which the user reviews and saves as their goal, so `/goals` is
  pre-filled from day one. Recalculate any time from the profile page
- **Gemini key rotation** - every `GEMINI_KEY<n>` is pooled. A rate-limited, rejected or
  failing key is skipped for the next one, the last key that worked is used first on the next
  request, and benched keys cool down before being retried. If every key and model fails
  within 25 seconds, the plan falls back to the Mifflin-St Jeor formula
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
- **Single food or meal with dishes** - `/log-meal` opens on a single food: one card with its
  name, amount (g, ml or a count), calories, macros and optional micronutrients. Switching to
  "Meal with dishes" adds a meal name ("Roti sabji") and one card per dish, so "2 rotis + 200 g
  paneer sabji" is two dishes each with their own nutrition, and the meal's totals update as you
  type. The date sits in the page header next to "Fill with JSON", and backdating is supported
- **Log a meal from a photo** - on `/log-meal`, upload a food photo or a nutrition label
  (optionally with a short description such as "half of this pizza"). Gemini classifies the
  image first, then reads the label or estimates the portion, and the form is pre-filled with
  the food name, portion, calories, macros and the few micronutrients that matter for it. Nothing is saved
  until the user edits what they like, confirms they reviewed it, and submits through the normal
  create endpoint. Blurry photos, non-food photos, unsupported files and AI outages each get a
  specific inline message with retry, another photo, or manual entry as the way forward
- **Bulk import from a PDF** - on `/meals/import` (linked from Meals), drop a food diary PDF and
  press Parse. The server extracts the text and Gemini turns it into one row per food, skipping
  totals and notes. Rows arrive in an editable table: anything the PDF left blank, smudged or
  only implied is flagged with the reason, and Confirm Import stays disabled until every flagged
  row is edited or marked "Looks right" and every row is valid. Rows can be removed. The import
  ends with a summary of how many entries were saved and which were skipped and why (invalid, or
  an exact duplicate of something already logged)
- **Assistant chat** - `/chat` is one continuous conversation per user. Ask "how am I doing
  this week" or "what's my goal" and the assistant answers with real numbers from the same
  services the dashboard and reports use. Say "I had 2 eggs and toast for breakfast" or "set my
  protein to 150 g" and it proposes the change as a preview card; nothing is saved until
  Confirm is pressed, and Cancel discards it. General nutrition questions are answered directly.
  The thread is stored in MongoDB, so it survives a refresh, with "Load earlier messages" paging
  back through older turns
- **Reports** - `/reports` charts daily calories, a stacked macro breakdown, calories against the
  goal target line, and summed micronutrients for the last 7, 14 or 30 days or a custom range
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
| `GEMINI_KEY1` ... `GEMINI_KEY4` | Gemini API keys from https://aistudio.google.com/apikey, used in rotation. Any number of `GEMINI_KEY<n>` works; blanks are ignored. With none set, onboarding uses the formula and photo extraction returns `503 AI_UNAVAILABLE` (manual entry still works) |
| `GEMINI_MODELS` | Optional comma-separated models, tried in order (default `gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite`). A 503 "high demand" moves to the next model on the same key instead of rotating keys |
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
cd t-backend  && npm test                     # backend test suites (needs MongoDB running)
cd t-backend  && npm run migrate:food-items   # preview converting old single-food entries; add -- --apply to run
cd t-backend  && npm run migrate:chat-confirmations  # preview merging old "Logged ..." chat messages into their proposal cards; add -- --apply to run
cd t-frontend && npm run build && npm start   # production build and serve
cd t-frontend && npm run lint                 # eslint
```

---

## Pages

| Route | Auth | What it does |
|---|---|---|
| `/` | - | Landing page |
| `/login`, `/signup`, `/forgot-password`, `/verify-email` | - | Auth flows. `/signup` is three steps: email, name + password, verification code |
| `/onboarding` | yes | Body profile form, then the recommended plan to review and save. Every other signed-in page redirects here until it is completed |
| `/profile` | yes | Name, account details, body profile and profile picture, plus resend verification |
| `/settings` | yes | Security (OTP-gated email and password change) and appearance (theme) |
| `/dashboard` | yes | Today's calories and macros against the active goal, plus a 7-day trend |
| `/goals` | yes | View and update the active goal. Pre-filled when one exists. |
| `/log-meal` | yes | Log a food entry, including add/remove micronutrient rows |
| `/meals` | yes | Filter, page through, edit and delete logged entries |
| `/meals/:id/edit` | yes | The meal form pre-filled with a saved entry |
| `/meals/import` | yes | Bulk import from a food diary PDF: upload, parse, review and edit rows, confirm |
| `/chat` | yes | The assistant: conversational logging, progress questions and nutrition advice, with confirm/cancel cards for any change |

## API Routes

Full parameter and response shapes are in [API.md](./API.md).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/check-email` | - | Check whether an email is free to register |
| `POST` | `/auth/register` | - | Create account (email, name, password) and mail a signup code |
| `POST` | `/auth/signup/resend-otp` | yes | Resend the signup verification code |
| `POST` | `/auth/signup/verify-otp` | yes | Verify the email with the signup code |
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
| `POST` | `/api/onboarding/plan` | yes | Calculate BMI and AI-recommended daily targets (saves nothing) |
| `POST` | `/api/onboarding/complete` | yes | Save the body profile and the accepted targets as the goal |
| `GET` | `/api/goals` | yes | Fetch the current user's goal (`null` if unset) |
| `POST` | `/api/goals` | yes | Create or overwrite the current user's goal |
| `GET` | `/api/food-entries` | yes | List entries: date range, meal type, paginated |
| `GET` | `/api/food-entries/summary` | yes | One day's totals plus the active goal |
| `GET` | `/api/food-entries/series` | yes | Day-by-day totals across a range, plus the active goal |
| `GET` | `/api/food-entries/:id` | yes | Fetch one entry the user owns |
| `POST` | `/api/food-entries` | yes | Create a food entry |
| `PATCH` | `/api/food-entries/:id` | yes | Edit an entry the user owns |
| `DELETE` | `/api/food-entries/:id` | yes | Delete an entry the user owns |
| `POST` | `/api/food-entries/import/preview` | yes | Read a food diary PDF into flagged, reviewable rows (multipart, field `file`; saves nothing) |
| `POST` | `/api/food-entries/import/confirm` | yes | Save reviewed rows, skipping invalid rows and exact duplicates |
| `POST` | `/api/ai/extract-nutrition` | yes | Read a draft entry from a food photo or nutrition label (multipart, field `image`; saves nothing) |
| `GET` | `/api/reports/weekly-calories` | yes | Daily calorie totals across a range |
| `GET` | `/api/reports/macros` | yes | Protein/carb/fat totals by day or ISO week |
| `GET` | `/api/reports/micros` | yes | Each micronutrient summed across a range |
| `GET` | `/api/reports/goal-comparison` | yes | Daily calories next to the goal's calorie target |
| `POST` | `/api/chat` | yes | Send a message; returns the stored reply, plus a `pendingAction` when it proposes a change (saves no entry or goal) |
| `POST` | `/api/chat/confirm-action` | yes | Re-validate and carry out a confirmed `logMeal` or `setGoal` action |
| `GET` | `/api/chat/history` | yes | The user's thread, paginated newest page first |

## Data Model

### `User`

```
email:          string (unique, required)
firstName:      string (optional - absent on accounts created before names were collected)
lastName:       string (optional)
password:       string (optional - only for local auth)
emailVerified:  boolean (default: false)
authProvider:   'local' | 'google'
googleId:       string (optional, sparse unique index)
bodyProfile:    { weightKg, heightCm, goalWeightKg, age, sex, activityLevel } (optional)
onboardingCompletedAt: Date (optional - set when the first plan is saved)
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
name:          string (required) - the meal's name; the server uses the item names joined when none is given
items:         FoodItem[] (at least one)
  name:        string (required) - for a count, what is counted ("Roti")
  quantity:    number (required) - total amount eaten, in unit
  unit:        'g' | 'ml' | 'count' (required)
  calories:    number (required) - for this item's quantity
  macros:      { proteinG, carbG, fatG } (all required) - for this item's quantity
  micros:      Map<string, { amount, unit }>
calories:      number - sum of the items, written by the server
macros:        { proteinG, carbG, fatG } - sums of the items, written by the server
micros:        Map<string, { amount, unit }> - per-nutrient sums of the items
date:          Date (required) - the day the food was eaten
source:        'manual' | 'ai-image' | 'pdf-import' | 'ai-chat' (default 'manual')
createdAt, updatedAt: Date
```

Compound index on `{ userId, date }` for "what did I eat on this day" reads, which also
serves the date-range list query and the daily summary aggregation.

### `ChatMessage`

```
userId:        ObjectId -> User (required)
role:          'user' | 'assistant' (required)
content:       string (required) - the visible text only, never a tool payload
action:        { tool: 'logMeal' | 'setGoal', status: 'pending' | 'confirmed' } - only on a reply
               that proposed a change; confirming flips it to 'confirmed'
createdAt:     Date
```

Compound index on `{ userId, createdAt: -1, _id: -1 }`, which serves both history pages and
loading the most recent turns as model context.

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
- **An entry is a meal of items, and each item has exactly three units: g, ml or count.** A meal
  mixes foods measured differently (rotis and eggs are counted, sabji and rice are weighed), so a
  single quantity and unit per entry could not describe "2 rotis + 200 g paneer sabji". Units are
  an enum rather than free text so amounts can be compared and summed; household measures
  (bowl, cup, katori) are entered as grams, and the name says what a count counts. `quantity` is
  the total amount eaten, and each item's `calories` and `macros` are for that amount, not per
  100 g.
- **Every entry has a name of its own, separate from its items.** "Roti sabji" names the meal
  while "Roti" and "Paneer sabji" name what is in it. The name is optional in the API: when it is
  blank or missing, the server names the entry after its items ("Roti + Paneer sabji"). On an
  edit that changes the items, a name that was only ever the items joined follows the new items,
  while a name the user typed is kept. A single food is simply named after the food, which is why
  the form only asks for a meal name in "Meal with dishes" mode. The form opens an existing entry
  in that mode whenever it has several items or a name that differs from its one item, so saving
  never overwrites a name the user chose.
- **Switching a meal back to a single food never drops dishes silently.** The toggle refuses
  while more than one dish exists and says to remove dishes first.
- **The date lives in the page header.** The form still owns the date's state and validation; it
  hands the date field to the page through a `renderHeader` slot, so the log and edit pages place
  it among their header actions without duplicating form state.
- **Nutrition lives on items; the entry's totals are derived and stored.** The server sums
  `calories`, `macros` and `micros` from the items on every create, edit and import, and never
  accepts totals from a client, so they cannot disagree. They are stored rather than computed on
  read so the dashboard, daily summary and every report keep aggregating one number per entry
  unchanged. Micronutrient totals convert g, mg and mcg to mg before adding.
- **Existing entries were migrated to one item each.** `npm run migrate:food-items` (in
  `t-backend`) previews the change; `-- --apply` first copies every old-shape document to a
  timestamped `foodentries_backup_*` collection, then converts it. `"250g"` with quantity 2
  becomes 500 g, `"L"` and `"kg"` convert to ml and g, and a counted unit with no field in the new
  model (`"bowl"`) becomes a count with the unit kept in the name ("Lentil soup (bowl)"). It only
  touches documents still in the old shape, so running it twice is safe. Entries converted before
  meal names existed are named after their items by the same command.
- **Micronutrients are an open map, not fixed fields.** `micros` is a Mongoose `Map` of nutrient
  name to amount and unit on each item (and summed on the entry), because which micros are known varies per food and per data source. Nutrient
  names are free text (up to 50 per item) and are stored verbatim, so `vitaminC` and
  `Vitamin C` are different keys. Duplicate names within a single submission are rejected
  client-side, compared case-insensitively.
- **Micronutrients are stored in milligrams.** Each nutrient is `{ amount, unit }`, and the meal
  form always writes `mg`. Photo extraction lets the model answer in the unit a label prints
  (`mg` or `mcg`) and converts to mg on the server, so vitamin D printed as 2 mcg is stored as
  0.002 mg. The micronutrient report keeps three decimals for the same reason.
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

- **Onboarding asks for age, sex and activity level as well as height, weight and goal weight.**
  Calorie needs cannot be estimated meaningfully without them (Mifflin-St Jeor needs age and
  sex, and activity scales the result by up to 60%). Sex is limited to male/female because
  that is what the equation models.
- **Onboarding is required before the rest of the app.** A goal is what the dashboard and
  reports measure against, so every protected page redirects to `/onboarding` until a plan is
  saved. Existing accounts are prompted once too. Signup email verification is not required:
  "Verify later" continues to onboarding, so a mail outage cannot lock a new user out.
- **The AI proposes, the formula guards.** The Mifflin-St Jeor result is always computed first.
  Gemini's answer is used only if it passes schema validation, lands within 25% of the formula's
  calories, and its macros add up to within 10% of its own calorie total. Otherwise the formula
  result is returned with `source: "formula"`, which the UI labels.
- **Macro split for the formula fallback.** Protein is 2.0 g/kg when losing, 1.6 g/kg when
  maintaining and 1.8 g/kg when gaining; fat is 25% of calories; carbs fill the rest. The deficit
  is 500 kcal and the surplus 300 kcal, with floors of 1200 kcal (female) and 1500 kcal (male).
  A goal within 1 kg of the current weight counts as maintaining.
- **Key rotation state is per process.** The sticky key and cool-downs live in memory, so a
  restart starts again from key 1 and multiple server instances rotate independently. A
  rate-limited key rests for 60 seconds (or the API's `Retry-After`); a rejected key rests for an
  hour. If every key is resting, they are still tried rather than failing without an attempt.
- **The goal weight is copied into the goal at onboarding, not kept in sync.** Editing the goal
  weight on `/goals` later does not change `bodyProfile.goalWeightKg`; recalculating the plan
  overwrites the goal again.

- **Photo extraction orchestration.** `POST /api/ai/extract-nutrition` runs these steps, all in
  `t-backend/src/services/aiNutritionExtraction.ts`, the only file in the feature that talks to
  an AI provider (swapping providers means replacing its response schema and one request
  function):
  1. The upload middleware accepts one JPEG, PNG, WebP or HEIC file of up to 8MB, held in memory
     and never written to disk or stored.
  2. The file's leading bytes must be a real image, whatever `Content-Type` the client claimed.
  3. Gemini receives the photo, the optional description, and a system prompt
     (`t-backend/src/lib/nutritionExtractionPrompt.ts`) listing every micronutrient the app
     offers. Its response schema restricts nutrient names to that list, so each one lands on a
     known option in the form. The list is there for naming only: the model reports just the
     significant nutrients, at most 6 (`MAX_REPORTED_MICRONUTRIENTS`), most important first.
     For a label that means the non-zero ones it prints; for a meal, roughly 10% or more of the
     FDA Daily Value, or nutrients that matter for the dish, such as sodium. The server enforces
     the cap too.
  4. The model must classify the photo as `nutrition-label`, `meal`, `unclear` or `not-food`
     before producing numbers. The last two become `422 IMAGE_UNCLEAR` / `NO_FOOD_DETECTED`
     with the model's own one-sentence reason.
  5. The answer is validated with zod, micronutrients are converted to mg, and the draft is
     checked against the same limits as `POST /api/food-entries`, so an unedited draft can
     always be saved. Anything unusable is `502 AI_BAD_RESPONSE`, never a half-filled form.
  6. Review warnings are attached: meal portions are always flagged as estimates, and calories
     that disagree with 4/4/9 macro energy by more than 20% are called out.
- **Photo confidence is a percentage built from four scored factors, not the model's gut feel.**
  The model scores each 0-100 against a written rubric in the prompt, with a one-line reason:
  *food identity* (do we know what it is), *portion size* (do we know how much), *nutrient
  values* (how reliable the numbers are for that food and amount, e.g. hidden oil) and *image
  quality*. `t-backend/src/lib/extractionConfidence.ts` then combines them deterministically:
  - Weights depend on the photo: label 20/25/45/10, meal 25/35/30/10 (identity, portion,
    nutrients, image). The printed numbers dominate a label; the portion dominates a plate.
  - Score = 75% weighted mean + 25% weakest factor, so one unknown (say the portion) always
    shows, even behind a sharp photo of a recognisable dish.
  - Hard caps: a label with no visible product name caps food identity at 50, because the food
    has to be inferred from its numbers. A label without a user description caps portion at 80,
    because it states one serving, not how much was eaten. Calories that disagree with the
    macros cost 15 points. The overall score never exceeds 95%.
- **The confidence level (High, Medium, Low) is a ladder of visible rules**
  (`t-backend/src/lib/confidenceLevel.ts`), applied in order, each one recorded in `levelSteps`:
  1. Start from the image type: a nutrition label starts High, a meal photo starts Medium.
  2. Up one: a meal whose description states the amount eaten ("2 slices", "150 g"). The model
     only answers whether the description contains an amount; the server also requires that a
     description was actually sent, so the model cannot grant this on its own.
  3. Down one for each of: calories and macros disagree; unsure what the food is (food identity
     below 60); unsure how much there is (portion size below 60).
  4. The level never claims more than the percentage supports: under 60% it is at most Medium,
     under 40% it is Low.
  A label with no product name therefore lands on Medium (its identity is capped at 50), and a
  plate you describe as "one whole pizza" reaches High. The UI shows "83% confidence · High"
  with a "Why?" breakdown: the level's steps, then every factor, weight, reason and cap.
- **A photo is split into items and named as a meal.** The model also suggests a meal name
  ("Dal Chawal"); a draft with several items or a distinct name opens in "Meal with dishes" mode.
- **Free text from a model is trimmed, never grounds for rejection.** An over-long note, reason or
  source line is cut to its limit instead of failing the whole photo or diary; numbers and enums
  are still validated strictly.
- **Photo items:** A plate of separate foods becomes one item per food (at most
  8), each with its own amount and nutrition; a single dish or a nutrition label is one item. A
  label is one printed serving in g or ml unless the description says otherwise ("2 cups of this"
  doubles it). Amounts on a meal photo are estimates, which the draft's warning says.
- **The photo cannot choose the meal or the date.** Meal type keeps the form's default (a
  `?mealType=` param if present, otherwise the time of day: breakfast 05-11, lunch 11-16, snack
  16-19, dinner otherwise) and the date defaults to today. The review checkbox restates both
  before saving.
- **An AI draft must be explicitly confirmed.** The form will not submit a photo draft until
  "I have reviewed the details" is ticked, and any new photo resets it. Entries saved this way
  have `source: "ai-image"`; editing one later keeps that source.
- **Large photos are downscaled in the browser** to a 1600px long edge before upload, which
  cuts upload and analysis time without hurting label legibility. Files the browser cannot
  decode (HEIC outside Safari) are sent unchanged, since the server and Gemini both accept them.
- **Photo analysis gets a longer time budget than onboarding:** 25 seconds per attempt and 45
  seconds across every key and model, because vision calls are slower. The UI shows staged
  progress and a Cancel button while it waits.

### PDF import

- **The PDF's text is read on the server, not sent to Gemini as a file.** `pdf-parse` extracts the
  text layer and only that text goes to the model, per the spec. Scanned diaries with no text
  layer are rejected with `PDF_NO_TEXT` rather than guessed at; the photo flow covers images.
- **Limits: 5MB, 10 pages, 50,000 characters, 100 rows per import.** A longer document is
  rejected instead of silently truncated. If the model finds more than 100 rows, the first 100
  are shown with a warning naming how many were found.
- **Missing values are never estimated.** A blank macro cell stays blank and flags the row, and
  the user types the value (or 0). The photo flow estimates because a plate has no numbers; a
  diary does, so filling gaps would invent data the user thinks they recorded.
- **"Needs review" is not a hard block on the server.** The preview flags rows; the review table
  requires each flagged row to be edited or marked "Looks right" before Confirm Import is
  enabled. Confirm itself validates every row with the single-entry schema and does not know
  about flags, so the API stays usable by other clients.
- **One diary line is one entry, named as the line names it, and each food on it is an item.** "Paneer sabji with 2 rotis +
  salad" becomes Roti (2, count), Paneer sabji (200 g) and Salad (100 g). Diaries usually print
  one set of numbers for the whole line, so the model divides it across the items so they add up
  exactly to what was printed, and the row is flagged for a check. A household measure (a bowl,
  a katori) is converted to an estimated weight and flagged the same way. Diary items carry no
  micronutrients: diaries rarely print them, and leaving them out keeps the response schema
  simple enough for Gemini to accept.
- **A duplicate is the same UTC day, set of item names (ignoring case and order) and total
  calories.** It is checked against the user's saved entries and against earlier rows of the same
  import. Meal type and quantities are deliberately not part of the key: the same foods with the
  same calories on the same day are almost always the same entry filed under a different meal. Only the current user's
  entries count, so another account's identical entry never blocks an import.
- **Invalid rows are skipped, not fatal.** The client only submits rows it has validated, so this
  is a safety net; a stale or hand-crafted request still saves its good rows and reports the rest.
- **Photo extraction and PDF import share one AI integration point.** Both go through
  `lib/gemini/geminiClient.ts` (key pool, model failover, time budget) and map provider failures
  with `lib/gemini/aiFailure.ts`. Gemini rejects `maxItems` on a large array of objects as too
  complex, so the row cap is applied in the service rather than in the response schema.

### Assistant chat

- **Only visible turns are stored.** Each `ChatMessage` is a user message or the assistant's
  reply. The function calls and tool results produced while answering exist only inside that
  request. A new message replays the last 20 stored turns as plain history, not the old tool
  internals; if the model needs fresh numbers it calls a read tool again.
- **Reads run immediately; writes need confirmation.** `getGoal`, `listMeals`,
  `getTodaySummary`, `getWeeklySummary`, `getMacroBreakdown` and `getGoalComparison` call the
  existing goal, food entry, daily intake and report services directly. `logMeal` and `setGoal`
  are validated and previewed, then the turn ends with a `pendingAction`, and the preview text is
  saved as the assistant's message with `action.status: "pending"`. This is the same "AI proposes, user reviews, user commits"
  pattern as photo extraction and PDF import.
- **Tool arguments are validated with the endpoint's own zod schema**, when proposed and again
  in `POST /api/chat/confirm-action`: `createFoodEntrySchema` for meals, `upsertGoalSchema` for
  goals, and the list, summary and report query schemas for reads. A call that fails validation
  goes back to the model as an error it can correct, or turn into a clarifying question, rather
  than failing the request. Confirming a hand-edited or stale action that no longer validates
  returns `400 INVALID_CHAT_ACTION` and saves nothing.
- **Confirming marks the proposal; it does not add a message.** `confirm-action` takes the
  proposing reply's `messageId` and flips its `action.status` from `pending` to `confirmed` in one
  atomic update before writing, so the thread shows each change once, as a card reading "Saved".
  A second confirm of the same proposal (double click, second tab) gets `409
  ACTION_ALREADY_CONFIRMED` and saves nothing; if the write itself fails the proposal is reopened.
  When history is replayed to the model, each proposal is annotated as saved or not saved, so the
  model never claims an unconfirmed meal was logged.
- **No tool accepts a user id.** Every tool is bound to the session user on the server, so no
  wording of a message can reach another account's data.
- **The model describes items with flat `proteinG`/`carbG`/`fatG` fields**, which it fills more
  reliably than nested objects. The server reshapes them into the standard item shape before
  validating, so what is confirmed is exactly a `POST /api/food-entries` body.
- **A goal change can name a single target.** Saving a goal replaces all of it (see above), so
  `setGoal` lays the model's changed targets over the saved goal, including the weight goal,
  and the preview lists only what changes ("protein 130 g to 150 g"). With no saved goal, all
  four daily targets are required. A change identical to the saved goal is refused.
- **"Today" is the user's day.** The client sends its local `YYYY-MM-DD` with each chat request.
  It sets the date in the system prompt and the default for meal dates and report ranges. A
  value more than a day from the server's UTC date is ignored in favour of the server's. Meals
  cannot be proposed for a future date.
- **Chat meals are stored with `source: "ai-chat"`**, set by the server on confirm whatever the
  echoed args say.
- **One change per reply.** If the model asks for several writes in one turn, only the first
  valid one becomes the pending action, and the prompt tells it to offer the rest afterwards.
  While a card is undecided the composer is disabled, so a follow-up cannot refer to it
  ambiguously.
- **Confirmed cards survive a refresh; undecided ones do not.** A confirmed proposal comes back
  from history as its card with "Saved" and a link to Meals or Goals. A proposal's arguments are
  not stored, so an undecided one shows after a refresh as an ordinary assistant message without
  Confirm/Cancel; asking again produces a fresh card. Cancelling is local to the page and logs
  nothing.
- **A message whose reply fails is removed again.** The user message is saved before the model
  is called, per the spec. If the turn then fails (provider down, empty reply, loop cap), that
  message is deleted, so the thread never holds an unanswered question and resending does not
  duplicate it. The UI keeps the failed message on screen with "Try again" and "Edit message".
- **Limits:** messages up to 2,000 characters; at most 5 model calls per message (then
  `502 CHAT_STEP_LIMIT`); 60 seconds for the whole turn (then `503 AI_UNAVAILABLE`); tool
  listings capped at 20 meals and report ranges at 92 days.
- **Replies are plain text.** The prompt asks for no Markdown, and stray `**bold**`, headings and
  `*` bullets are stripped on the server before saving, since the thread renders text as typed.
- **No agent framework.** The loop in `services/chatAgent.ts` calls Gemini's native function
  calling through `lib/gemini/geminiConversation.ts`, which shares the key pool and model
  failover with every other AI feature. The model's function-call turns are replayed verbatim
  within a turn, because Gemini 3 attaches thought signatures that must be sent back.

## Data isolation

Every user's goal and food entries are private to them. This was audited deliberately rather
than assumed:

- **Identity comes only from the session.** `requireAuth` resolves the user from the httpOnly
  `access_token` cookie, and every Goal, FoodEntry, listing, summary, series and report handler
  reads the id through `getAuthenticatedUserId(req)`. No endpoint accepts a `userId` in the body,
  query or params: zod strips unknown query keys, and the create/update services copy only
  named fields, so a smuggled `userId` is ignored.
- **Every query is scoped.** List, summary, series and all four reports filter or `$match` on
  the caller's `userId`; goals are read and upserted by `{ userId }`. Single-entry read, update
  and delete load by id and then compare owners: a missing entry is `404`, another user's entry
  is `403` with no entry data in the body.
- **Indexes.** `Goal.userId` has a unique index (one active goal per user). `FoodEntry` has
  `{ userId: 1, date: -1 }`, which serves both user-only and user + date-range queries.
- **Import is scoped the same way.** Confirm saves under the session user, ignores any `userId`
  in the body, and only checks the caller's own entries for duplicates
  (`t-backend/tests/foodEntryImport.test.ts` covers all three).
- **Chat is scoped the same way.** History and context are read by `{ userId }`, and every
  chat tool is bound to the session user on the server. `t-backend/tests/chat.test.ts` checks
  that one user's history never appears in another's.
- **Verified by test.** `t-backend/tests/dataIsolation.test.ts` (`npm test`) boots the app
  in-process against a throwaway database, creates two users with an entry and a goal each,
  and checks that user A gets `403`/`404` reading, editing or deleting user B's entry (and that
  the stored entry is unchanged), that a `userId` smuggled into create, update, goal or query
  input is ignored, that listing, summary, series and every report total only user A's data,
  that unauthenticated calls get `401`, and that the indexes above exist. Disabling the owner
  check in `foodEntry.service.ts` makes the suite fail, so it guards against regressions.

The one deliberate trade-off is `403` rather than `404` for another user's entry id, which
reveals that the id exists. No field of the entry is ever returned, so this was kept for
clearer client errors; switching to a `{ _id, userId }` lookup would make both cases `404`.

## Known gaps

- Chat automated tests (`t-backend/tests/chat.test.ts`) drive the agent loop with a scripted
  model: read tools run and return stored numbers, a write becomes a pending action with nothing
  saved, invalid arguments go back to the model, partial goal changes merge, and the iteration
  cap holds. The HTTP tests cover validation, `401`, provider-down `503` with the user message
  rolled back, confirm (tampered args, double confirm, another user's proposal) and history paging and isolation. Against live
  Gemini, the flow was checked end to end on a throwaway database: a breakfast description became
  a two-item pending action that saved on confirm, "how am I doing today" and "what did I eat this
  week" answered with the stored numbers, "change my protein target to 150g" produced a one-field
  goal diff, a protein question was answered without tools, and a nonsense message got a polite
  redirect. Replies took 3-5 seconds normally. While Gemini returned 503 "high demand", some turns
  took 25-50 seconds and two hit the 60-second budget, failing cleanly with `503`.

- Automated tests cover data isolation, multi-item create and edit (totals summed from items,
  client totals ignored), item totals and the legacy-entry migration, PDF import confirm
  (validation, duplicates, ownership, input checks) and the preview row shaping. Preview itself calls Gemini, so it was verified by
  hand: a realistic tabular diary (three days, 14 foods, wrapped cells, daily totals, a blank macro
  row, a smudged calorie value and a row with no meal) produced 14 rows with totals and notes
  skipped and exactly those three rows flagged. Editing them, removing one row and confirming in
  the browser saved 11 entries, skipped the 2 that duplicated pre-existing entries, and left the
  pre-existing entries byte-for-byte unchanged; importing the same PDF again saved nothing and
  skipped all 13. After entries moved to items, the same browser run logged a two-item meal (Roti
  × 2 + Paneer sabji 200 g) with a live 560 kcal total, saw it listed as "Roti + Paneer sabji, 2
  items", removed an item in the editor and got re-summed totals, and imported a diary whose
  lines list several foods: every stored entry's totals equalled the sum of its items. The rest of
  the API was verified end to end manually: register, goal upsert,
  entry create/read/patch/delete, a 29-entry paginated walk at `limit=6` confirming every
  record is visited exactly once, date-range and meal-type filters, the daily summary with and
  without a goal, and the 400/401/403/404 paths. The OTP-gated account changes were verified the
  same way against a throwaway account: a correct code commits the change and the new password
  logs in while the old one stops working, a replayed code is rejected, an expired code is
  rejected, a new password identical to the current one is rejected, the sixth wrong guess
  locks the code out and discards it, and a verified email change promotes `pendingEmail` and
  sets `emailVerified`.
- Two confirm requests for the same rows sent at the same moment could both pass the duplicate
  check before either writes. The UI disables the button while saving, so this needs a second tab
  or a script; a unique index would close it but would also forbid legitimately logging the same
  food twice in a day.
- `POST /api/onboarding/plan`, `POST /api/ai/extract-nutrition`,
  `POST /api/food-entries/import/preview` and `POST /api/chat` have no rate limit. Each
  call can use Gemini quota (photo extraction especially), so a per-user limit would be worth
  adding before production.
- Photo nutrition is an estimate. Labels were read exactly in testing, but meal portions are
  judged from a single photo with no scale reference, which is why the portion warning and the
  review confirmation exist. An image Gemini blocks or returns empty for is retried on the next
  key like any bad response, so it can take up to the 45-second budget before failing with
  `503`.
- The link-based verification banner on `/profile` still exists alongside the signup code, so
  an account that chose "Verify later" verifies by link rather than by code.
- The meals list filters on the server. Date edits wait 400 ms for a pause, because typing a date
  with the keyboard yields a valid date after every segment; meal type, reset and paging apply
  at once. Only the newest request may update the list, so a slow earlier response can never
  overwrite rows for the current filters. A future free-text search should reuse the same
  debounced path.
