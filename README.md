# INTAKE

**Deployed Link:** [https://intake.aman-raj.me/](https://intake.aman-raj.me/)

**Demo Video:** [Watch on Google Drive](https://drive.google.com/file/d/1P8-HJKmQ2edq5xX_WYd2TCRy8bkObGSr/view?usp=sharing)

INTAKE is a full-stack nutrition tracking app. Users set daily calorie and macro goals, log meals (single foods or multi-dish meals), extract nutrition from food photos and labels with Gemini AI, bulk import PDF food diaries, chat with an assistant that can read their data and propose meals or goal changes, and review progress on a dashboard and reports page.

The REST API is documented in [API.md](./API.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (`t-frontend`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts |
| Backend (`t-backend`) | Express 4, TypeScript, Zod validation |
| Database | MongoDB with Mongoose 8 |
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

### 4. Third-party services

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

The test suite never calls Gemini or Google, and fills in placeholder JWT and OAuth values when `.env` is missing them.

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

### AI photo and label extraction

- **AI results are drafts.** Extracted nutrition fills the meal form but is never saved until the user reviews it and confirms.
- **Confidence is computed, not guessed by the model.** The score is a weighted mix of four factors (food identity, portion size, nutrient values, image quality), with different weights for meal photos and nutrition labels, blended with the weakest factor so one poor factor pulls the score down. The level (high, medium, low) follows fixed rules: labels start high, meal photos start medium, and low identity, uncertain portions or inconsistent macros lower it.
- **Image handling.** Images up to 8 MB (JPEG, PNG, WebP, HEIC) are processed in memory and never written to disk. The browser downscales images to 1600 px before upload.

### PDF food diary import

- **Text only.** The server extracts the PDF's text layer and sends only text to Gemini. Scanned PDFs without a text layer are not supported.
- **Limits:** 5 MB, 10 pages, 50,000 characters and 100 rows per import.
- **Missing values are never guessed.** Rows with missing or unclear values are flagged for review and must be fixed or confirmed before saving.
- **Duplicates** are detected against existing meals and earlier rows in the same file by date, item names (ignoring case and order) and total calories, and are skipped on save.

### Chat assistant

- **The assistant reads freely but never writes on its own.** Read tools (goals, meals, summaries, reports) run immediately. Logging a meal or changing a goal only produces a proposal card; nothing is saved until the user presses Confirm, which re-validates the data with the same rules as the regular endpoints.
- **Goal proposals store only what changes**, so edits made on the Goals page before confirming are not overwritten.
- **Tools are bound to the signed-in user.** The model never sees user IDs and cannot access other users' data.
- **Context is the last 20 messages.** Tool calls made while producing a reply are not stored. The stored thread is never pruned (known limitation).
- **Turns are bounded:** at most 5 tool calls, 10 seconds per tool and 60 seconds per turn. Failed replies can be retried.
- **The client sends its local date and time** so "today", "yesterday" and the default meal type match the user's timezone. If the date is more than a day off from the server's, it is ignored.
- **No agent framework.** The tool loop is a small explicit loop over Gemini function calling, since the tools are flat and need no branching or long-running workflows.

### Authentication and security

- **Sessions use `httpOnly` cookies** holding an access token and a refresh token.
- **OTPs** are 6 digits, stored hashed, expire after 10 minutes and are invalidated after 5 wrong attempts. Password changes need an OTP sent to the current email; email changes need an OTP sent to the new address.
- **Google accounts** cannot change their password or email in the app.
- **Data isolation.** The user is always taken from the session token, never from the request. Every query is scoped to that user, and accessing another user's meal returns `403`.

### Rate limiting

- **Limits per policy:** general 500 requests / 15 min; failed credential attempts 10 / 15 min; account creation 20 / hour; emails 5 / hour; AI requests 40 / 15 min; avatar uploads 10 / hour. Throttled requests return `429` with a `RATE_LIMITED` code.
- **Signed-in requests are counted per account**, signed-out requests per IP. Endpoints under the same policy share one counter.
- **Counters are in memory** (known limitation): they reset on restart and are not shared across multiple server instances.
