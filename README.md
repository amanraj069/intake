# INTAKE

**Deployed Link:** [https://intake.aman-raj.me/](https://intake.aman-raj.me/)

**Demo Video:** [Watch on Google Drive](https://drive.google.com/file/d/1P8-HJKmQ2edq5xX_WYd2TCRy8bkObGSr/view?usp=sharing)

INTAKE is a full-stack nutrition tracking app. Users set daily calorie and macro goals, log meals (single foods or multi-dish meals), extract nutrition from food photos and labels with Gemini AI, bulk import PDF food diaries, chat with an assistant that can read their data and propose meals or goal changes, and review progress on a dashboard and reports page.

The REST API is documented in [API.md](./API.md). Optional Redis-backed rate limiting and session revocation are documented in [REDIS.md](./REDIS.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (`t-frontend`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts |
| Backend (`t-backend`) | Express 4, TypeScript, Zod validation |
| Database | MongoDB with Mongoose 8 |
| Cache / shared state | Redis via ioredis *(optional)*: rate-limit counters (`rate-limit-redis`) and refresh-token revocation |
| Background jobs | BullMQ on Redis *(optional)*: PDF diary imports, with retries, backoff and a dead-letter queue |
| Auth | JWT in `httpOnly` cookies, Passport.js Google OAuth 2.0, bcryptjs |
| AI | Google Gemini API (photo extraction, PDF parsing, chat assistant) |
| Media storage | Cloudinary |
| Email | Resend |
| PDF parsing | pdf-parse |

---

## Prerequisites

- **Node.js** 20 or higher, with npm
- **MongoDB**: a local instance (`mongodb://localhost:27017`) or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- **Gemini API key**: at least one, from [Google AI Studio](https://aistudio.google.com/apikey)
- **Resend API key**: from [Resend](https://resend.com/api-keys), for verification and OTP emails
- **Redis** *(optional)*: for rate limits and session revocation shared across instances and restarts. Without it the backend uses memory. See [REDIS.md](./REDIS.md)
- **Cloudinary account** *(optional)*: for avatars and photo uploads
- **Google OAuth credentials** *(optional)*: for "Sign in with Google"

---

## Setup

### 1. Install dependencies

```bash
git clone https://github.com/amanraj069/intake.git
cd intake

cd t-backend && npm install
cd ../t-frontend && npm install
```

### 2. Configure environment variables

Both apps ship with a `.env.example`. Copy each one and fill in the values.

```bash
cp t-backend/.env.example t-backend/.env
cp t-frontend/.env.example t-frontend/.env
```

**Backend (`t-backend/.env`)**

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port. Default `9000` |
| `MONGODB_URI` | Yes | MongoDB connection string, e.g. `mongodb://localhost:27017/tdb` |
| `JWT_ACCESS_SECRET` | Yes | Access token secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (must differ from the access secret) |
| `JWT_EMAIL_SECRET` | Yes | Email verification token secret |
| `FRONTEND_URL` | Yes | Frontend origin for CORS and email links. Default `http://localhost:3000` |
| `GEMINI_KEY1` | Yes | Gemini API key |
| `GEMINI_KEY2`, `GEMINI_KEY3`, ... | No | Extra Gemini keys, used in rotation when a key is rate limited |
| `GEMINI_MODELS` | No | Comma-separated model fallback chain, tried in order |
| `RESEND_API_KEY` | Yes | Resend API key |
| `EMAIL_FROM` | Yes | Sender address. `onboarding@resend.dev` works for local testing |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | Default `http://localhost:9000/auth/google/callback` |
| `TRUST_PROXY` | No | Number of reverse proxies in front of the server. Keep `0` locally |
| `RATE_LIMIT_ENABLED` | No | Set to `false` to disable rate limiting. Default `true` |
| `IMPORT_WORKER_CONCURRENCY` | No | PDF imports one process runs at once. Default `2` |
| `IMPORT_JOBS_PER_MINUTE` | No | PDF imports started per minute across all workers (BullMQ only). Default `10` |
| `IMPORT_WORKER_IN_API` | No | Set to `false` to run the import worker as its own process with `npm run worker`. Default `true` |
| `REDIS_URL` | No | e.g. `redis://localhost:6379`. Stores rate-limit counters and token revocations in Redis. Unset: in-memory. If Redis is unreachable (at startup or later) the backend keeps working on in-memory stores and switches back when it reconnects |

Generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Frontend (`t-frontend/.env`)**

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL, e.g. `http://localhost:9000` |

### 3. Start MongoDB

No migrations or seed data are needed. Collections and indexes are created automatically on first write.

```bash
# macOS (Homebrew)
brew services start mongodb-community

# or Docker
docker run -d -p 27017:27017 --name intake-mongo mongo:7
```

### 4. Start Redis (optional)

Skip this step to run on in-memory stores. To use Redis, start it and set `REDIS_URL=redis://localhost:6379` in `t-backend/.env`. Every key expires on its own, but the instance must use `maxmemory-policy noeviction` and `appendonly yes`, so revoked sessions cannot be evicted or lost on a restart. The backend warns at startup if it can see either setting is wrong. What is stored and why is in [REDIS.md](./REDIS.md).

```bash
docker run -d -p 6379:6379 --name intake-redis redis:7 \
  redis-server --appendonly yes --maxmemory-policy noeviction
```

`GET /health` reports `data.redis` as `connected`, `unavailable` or `disabled`.

### 5. Third-party services

- **Resend:** with `EMAIL_FROM=onboarding@resend.dev`, emails are only delivered to the address registered on your Resend account. To email other addresses, verify a domain in Resend and use an address on it.
- **Cloudinary:** if not configured, avatar and photo upload endpoints return `503`; everything else still works.
- **Google OAuth:** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a Web application OAuth client. Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:9000/auth/google/callback` as an authorized redirect URI.

---

## Running the App

Run the backend and frontend in separate terminals:

```bash
# Terminal 1: backend on http://localhost:9000
cd t-backend
npm run dev
```

```bash
# Terminal 2: frontend on http://localhost:3000
cd t-frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Import worker.** With `REDIS_URL` set, PDF imports run on a BullMQ queue whose worker starts inside the backend process. To run it separately (so slow AI imports never share a process with API requests), set `IMPORT_WORKER_IN_API=false` and start it in a third terminal:

```bash
cd t-backend
npm run worker
```

Without Redis, imports run on an in-memory queue inside the backend and no worker process is needed.

**Production build**

```bash
cd t-backend && npm run build && npm start
cd t-frontend && npm run build && npm start
```

**Tests and linting**

```bash
cd t-backend
npm test        # needs MongoDB running; uses a throwaway database that is dropped afterwards
npm run lint

cd t-frontend
npm run lint
```

The test suite never calls Gemini or Google, and fills in placeholder JWT and OAuth values when `.env` is missing them. It also ignores `REDIS_URL` and runs on the in-memory stores, so it never touches a local Redis.

---

## Assumptions

### Goals

- **Goals are versioned, not overwritten.** Saving a goal closes the current version and starts a new one effective today. Each version has a `startDate` and an `endDate` (`null` while active), and only one version per user can be active. Saving again on the same day updates that day's version instead of creating another.
- **Reports use the goal active on each day.** Past days are compared against the goal that was in effect then, not the current one. Days before the first goal have no target.
- **Goals always start today.** Future-dated or backdated goals are not supported.
- **Clearing the weight target.** Omitting `weightGoalKg` when saving a goal clears it rather than keeping the previous value.
- **Onboarding.** Recommended targets come from Gemini, falling back to the Mifflin-St Jeor formula if the AI call fails. Accepting them creates the first goal.

### Meals and nutrition

- **Every meal is a list of items.** A single food is a meal with one item; a dish like "Roti Sabji" is a meal with several items (e.g. 2 rotis + 200 g sabji), each with its own quantity and nutrition.
- **Units are `g`, `ml` or `count` only.** Household measures like cups or bowls must be converted to an estimated weight or described in the item name.
- **Totals are computed by the server.** Meal calories, macros and micronutrients are summed from the items on every create and edit. Client-sent totals are ignored.
- **Micronutrients are stored in milligrams.** They are a free-form key-value map (e.g. `iron`, `vitaminC`); values entered in `g` or `mcg` are converted to `mg` so they can be summed.
- **Days are UTC calendar days.** Dates are sent as `YYYY-MM-DD` and stored at UTC midnight. A day covers `[00:00 UTC, next 00:00 UTC)`.
- **"On target" means 90% to 110%** of the active target.
- **Calorie split uses 4/4/9.** The dashboard computes energy share at 4 kcal/g protein, 4 kcal/g carbs and 9 kcal/g fat.

### Shared meals

- **Shares point at the live meal.** A share stores only `userIdSharing`, `userIdShared` and `mealId`, so the recipient always sees the owner's current version. Deleting the meal removes its shares.
- **Shares are read-only.** Recipients open a shared meal from the Shared page to see its full details (photo, dishes, macros, micronutrients) but cannot edit it, delete it or log it as their own. Opening it marks the share as seen.
- **The Shared page shows both directions.** "Shared with me" lists meals others sent you, one row per share. "Shared by me" lists one row per meal with everyone it is shared with.
- **"New" means not yet shown on the Shared page.** Each share stores `seenAt`. Opening "Shared with me" marks the shares on that page as seen, which clears the sidebar dot at once; the per-meal dots stay for that visit so the user can tell what was new. Shares created before `seenAt` existed count as new once.
- **The red dot is polled, not pushed.** The unseen count refreshes on navigation, on window focus and every 60 seconds, so a new share can take up to a minute to appear while the user stays on one page.
- **Only the owner manages access.** From "Shared by me", the row menu's "Manage access" lists every recipient; unticking people and choosing "Update access" deletes their shares. Revoking someone who no longer has access is a no-op, not an error.
- **Recipients must already have an account.** Sharing with an unregistered email fails with an error; no invite is sent.

### AI photo and label extraction

- **AI results are drafts.** Extracted nutrition fills the meal form but is never saved until the user reviews it and confirms.
- **Confidence is computed, not guessed by the model.** The score is a weighted mix of four factors (food identity, portion size, nutrient values, image quality), with different weights for meal photos and nutrition labels, blended with the weakest factor so one poor factor pulls the score down. The level (high, medium, low) follows fixed rules: labels start high, meal photos start medium, and low identity, uncertain portions or inconsistent macros lower it.
- **Image handling.** Images up to 8 MB (JPEG, PNG, WebP, HEIC) are processed in memory and never written to disk. The browser downscales images to 1600 px before upload.

### PDF food diary import

- **Text only.** The server extracts the PDF's text layer and sends only text to Gemini. Scanned PDFs without a text layer are not supported.
- **Limits:** 5 MB, 10 pages, 50,000 characters and 100 rows per import.
- **Imports run as background jobs.** The upload checks the PDF and extracts its text immediately, so a bad file is rejected in the upload's own response. The AI passes (reading, splitting combined dishes, filling missing nutrition) then run as a queued job the client polls every 2 seconds, showing which pass it is on. The job carries the extracted text, never the PDF.
- **Only provider failures are retried.** A job gets 3 attempts with exponential backoff (5s, then 10s) when Gemini is unavailable or returns a malformed answer. A file problem (not a food diary, no entries) fails at once, since retrying cannot fix it. Jobs that fail every attempt for a service reason are copied to a dead-letter queue for 7 days; file problems are not.
- **Concurrency is capped.** Each worker runs at most `IMPORT_WORKER_CONCURRENCY` imports, and BullMQ's limiter starts at most `IMPORT_JOBS_PER_MINUTE` across all workers, so a burst of uploads queues instead of exhausting the Gemini quota that photo and chat requests also need.
- **Redis is still optional.** Without it, or when it cannot be reached at upload time, the same job contract (concurrency cap, retries, progress, one-hour retention) runs in memory. Those jobs are lost on a restart, and their cap applies per instance.
- **Cancel stops waiting, not the job.** Cancelling in the UI stops polling; a job already running finishes and expires unread after an hour.
- **Missing values are never guessed.** Rows with missing or unclear values are flagged for review and must be fixed or confirmed before saving.
- **Duplicates** are detected against existing meals and earlier rows in the same file by date, item names (ignoring case and order) and total calories, and are skipped on save.

### Chat assistant

- **The assistant reads freely but never writes on its own.** Read tools (goals, meals, summaries, reports) run immediately. Logging a meal or changing a goal only produces a proposal card; nothing is saved until the user presses Confirm, which re-validates the data with the same rules as the regular endpoints.
- **Goal proposals store only what changes**, so edits made on the Goals page before confirming are not overwritten.
- **Tools are bound to the signed-in user.** The model never sees user IDs and cannot access other users' data.
- **Context is the last 20 messages.** Tool calls made while producing a reply are not stored. The stored thread is never pruned (known limitation).
- **Turns are bounded:** at most 5 tool calls, 10 seconds per tool and 60 seconds per turn. Failed replies can be retried.
- **The client sends its local date and time** so "today", "yesterday" and the default meal type match the user's timezone. If the date is more than a day off from the server's, it is ignored.
- **Repeat meals skip the model.** Every saved meal adds itself and each of its items to a per-user meal catalogue (from any source: the form, a photo, a PDF import or the chat). A text message that only asks to log catalogue foods ("had roti sabji for lunch", "log 3 rotis for dinner") is proposed from the catalogue on the usual Confirm/Cancel card, with no Gemini call. The shortcut is strict: every food in the message must be in the catalogue, the meal must be named or inferable from the local time, and the day must be today or yesterday. Questions, photos, new foods, modifiers ("with less oil"), follow-ups ("log it") and a quantity in a different unit than was logged (e.g. grams of a food logged as a count) all go to the model.
- **The catalogue is two linked collections.** `MealCatalogItem` holds one document per food and unit (so "Roti" counted and "Roti" weighed are separate) with its latest logged portion. `MealCatalogDish` holds only a name and links to its items with the dish's own quantities, so its nutrition is always derived from the items: correcting a food corrects every dish that contains it. Names match ignoring case, plurals and articles. Dishes are looked up first; only foods no dish matched, and foods given with an amount, are looked up as items. Deleting a meal does not remove its foods from the catalogue.
- **Synonyms come free with the first log.** When the assistant proposes a meal, the same tool call also returns other names for each food and the meal (English, Hindi, Devanagari, common Hinglish spellings, e.g. "Rice": "chawal", "चावल"). They are kept server-side on the proposal and added to the catalogue only when the user confirms, and only for foods the user did not change first. Later messages match a food by its name or any synonym. An exact name always wins; a synonym shared by two different foods (two kinds of "dal") is left to the model.
- **Hinglish and Devanagari messages are read too** ("maine lunch mein 2 roti aur dal khayi", "मैंने लंच में रोटी खाई"): meal words such as "nashta", postpositions such as "mein" and "ke liye", Hindi numbers and Hindi question words. "kal" is always left to the model, since it means both yesterday and tomorrow.
- **Amounts rescale the stored portion.** An amount in the unit a food was logged in is scaled from its latest portion, micronutrients included ("1 roti" after logging 3 rotis is a third of everything). A count in front of a saved dish that is not also an item means servings, scaling every linked food ("half roti sabji").
- **No agent framework.** The tool loop is a small explicit loop over Gemini function calling, since the tools are flat and need no branching or long-running workflows.

### Authentication and security

- **Sessions use `httpOnly` cookies** holding an access token (15 minutes) and a refresh token (7 days).
- **Sessions are revocable immediately.** Each sign-in gets a session id (`sid`) carried by both tokens. Logging out revokes the session, and every authenticated request checks it (one Redis `MGET`), so a copied access token stops working at once rather than when it expires. Revoked requests return `401` with code `SESSION_REVOKED`.
- **Refresh tokens are rotated, with reuse detection.** Each carries a unique `jti`. Refreshing retires the old token; another tab may reuse it for 30 seconds, so concurrent refreshes do not sign the user out. A retired token presented after that means it was copied, so the whole session is ended and the user signs in again.
- **Sign out other devices.** The profile page can end every other session of the account at once (`POST /auth/logout-other-devices`); this browser stays signed in.
- **Password changes sign out every other session.** A password reset, or either password-change flow, rejects all refresh tokens issued before it; the browser that made a change gets fresh cookies and stays signed in.
- **Redis outages never sign anyone out.** If Redis is unreachable, session checks, refresh, logout and password flows run on in-memory stores, and the records written meanwhile are replayed into Redis when it reconnects. Revocations made *before* the outage are not visible until it ends; that is the only effect, and it is on security, not on users.
- **OTPs** are 6 digits, stored hashed, expire after 10 minutes and are invalidated after 5 wrong attempts. Password changes need an OTP sent to the current email; email changes need an OTP sent to the new address.
- **Google accounts** cannot change their password or email in the app.
- **Data isolation.** The user is always taken from the session token, never from the request. Every query is scoped to that user, and accessing another user's meal returns `403`.

### Idempotent writes

- **Logging a meal, confirming a chat proposal and confirming a PDF import are idempotent.** The client sends an `Idempotency-Key` header; the server runs each key at most once per user and endpoint and replays the stored response to any repeat for 24 hours. A double tap or a "Try again" after a dropped connection therefore never saves a second copy.
- **MongoDB holds the keys, not Redis.** A unique index on (user, endpoint, key) is the lock and a TTL index expires records, so the guarantee holds even with Redis optional or down.
- **The client keeps one key per intended write.** Resubmitting the same values reuses the key; changing them or a success starts a new one. A chat confirmation is keyed by its proposal's id, since a proposal can only be saved once.
- **Only successes are stored.** A failed attempt frees its key so it can be retried. A claim held by a request that crashed mid-write is taken over by a retry after 2 minutes.
- **The response is stored before it is sent.** Once a client has seen a response, any retry gets that same response back.

### Rate limiting

- **Limits per policy:** general 500 requests / 15 min; failed credential attempts 10 / 15 min; account creation 20 / hour; emails 5 / hour; AI requests 40 / 15 min; avatar uploads 10 / hour. Throttled requests return `429` with a `RATE_LIMITED` code.
- **Route-level limits count signed-in requests per account**, signed-out requests per IP. The `general` limit always counts per IP, because it runs before any route has identified the user, so people behind one shared IP share its 500-request budget. Endpoints under the same policy share one counter.
- **Counters live in Redis when `REDIS_URL` is set**, one key per policy and client, so they are shared across instances and survive restarts and deploys. Without Redis they are in memory: they reset on restart and each instance counts separately (use Redis for multi-instance deployments).
- **Rate limits survive Redis outages.** Each policy counts in Redis while it is reachable and in memory while it is not, so limits (including the 10-failures brute-force limit) never switch off and never return errors.
- **A dropped Redis connection costs nothing per request.** Commands are never queued behind a dead connection; they go straight to memory (measured: about 3 ms per request during an outage).
- Key layout, TTLs and failure behaviour are documented in [REDIS.md](./REDIS.md).
