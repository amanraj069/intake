# INTAKE

**Deployed Link:** [https://intake.aman-raj.me/](https://intake.aman-raj.me/)

INTAKE is a modern, full-stack nutrition intelligence and meal tracking application. Designed with a clean, minimalist aesthetic and strict data isolation, INTAKE enables users to set personalized daily caloric and macronutrient targets, log single-item foods or multi-dish meals, scan food photos and nutrition labels using Gemini AI, bulk import PDF food diaries with automated validation and duplicate detection, interact with a conversational nutrition assistant via native function calling, and monitor health trends through interactive dashboards and reports.

---

## Table of Contents

1. [Architecture & Tech Stack](#architecture--tech-stack)
2. [Platform Features](#platform-features)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Setup & Running Guide](#step-by-step-setup--running-guide)
   - [1. Clone & Install Dependencies](#1-clone--install-dependencies)
   - [2. Environment Variables Configuration](#2-environment-variables-configuration)
   - [3. Database Setup](#3-database-setup)
   - [4. Third-Party Service Configuration](#4-third-party-service-configuration)
   - [5. Running the Application](#5-running-the-application)
   - [6. Testing & Utility Scripts](#6-testing--utility-scripts)
5. [Application Pages & Routes](#application-pages--routes)
6. [API Reference](#api-reference)
7. [Data Models & Schema Design](#data-models--schema-design)
8. [Architectural & System Assumptions](#architectural--system-assumptions)
   - [Goals & Target Management](#goals--target-management)
   - [Food Entries & Nutritional Modeling](#food-entries--nutritional-modeling)
   - [AI Photo & Nutrition Label Extraction](#ai-photo--nutrition-label-extraction)
   - [PDF Food Diary Bulk Import](#pdf-food-diary-bulk-import)
   - [Conversational Assistant & Native Function Calling](#conversational-assistant--native-function-calling)
   - [Authentication & Account Security](#authentication--account-security)
   - [Multi-Tenant Data Isolation](#multi-tenant-data-isolation)
   - [API Rate Limiting](#api-rate-limiting)

---

## Architecture & Tech Stack

```
intake/
├── t-frontend/    # Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts
├── t-backend/     # Express 4, Node.js, TypeScript, MongoDB / Mongoose 8, Zod
├── API.md         # Comprehensive REST endpoint specification
└── README.md      # Platform documentation and setup guide
```

### Core Technologies

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | Next.js 16 (App Router) | Server and client components, React 19, TypeScript |
| **Styling & Design** | Tailwind CSS v4 | Minimalist theme, dark/light mode toggle, custom semantic macro tokens |
| **Data Visualization** | Recharts | Interactive calorie dials, macro progress bars, stacked bar charts |
| **Backend Framework** | Express 4 | Modular TypeScript architecture (routes, controllers, services, schemas) |
| **Database & ODM** | MongoDB, Mongoose 8 | Indexed collections for users, goals, food entries, and chat messages |
| **Request Validation** | Zod | Strict schema validation for all HTTP bodies, params, and query strings |
| **Authentication** | JWT, Passport.js, bcryptjs | Access and refresh tokens stored in `httpOnly` cookies, Google OAuth 2.0 |
| **Artificial Intelligence** | Google Gemini API | Key rotation pool with model fallback (photo extraction, PDF parsing, chat agent) |
| **Media Storage** | Cloudinary | Profile picture storage, chat photo attachments, and meal photo uploads |
| **Email Delivery** | Resend | Transactional signup verification codes and OTP password/email reset emails |
| **Document Parsing** | pdf-parse | Server-side text layer extraction from PDF files |

### Architectural Layering

- **Backend Architecture (`t-backend`):**
  - `routes/`: Express route definitions, parameter binding, and middleware wiring.
  - `controllers/`: Request handling, status code orchestration, and response shaping.
  - `services/`: Core business logic, database queries, and external service integrations.
  - `models/`: Mongoose schemas, types, and database indexes.
  - `schemas/`: Zod validation schemas for request bodies, queries, and route parameters.
  - `middleware/`: JWT authentication verification, Zod input validation, file uploads (`multer`), and centralized error handling.
  - `lib/`: Reusable utilities (JWT issuance, cookie helpers, email delivery, Gemini client pool).

- **Frontend Architecture (`t-frontend`):**
  - `src/app/`: Next.js App Router routes and page layouts.
  - `src/components/ui/`: Atomic UI components (Buttons, Inputs, Dialogs, Cards, Badges).
  - `src/components/layout/`: Application shell, responsive sidebar navigation, user profile menus.
  - `src/components/<feature>/`: Feature-specific modules (Dashboard, Goals, Meals, Photo Extraction, PDF Import, Chat, Reports).
  - `src/hooks/`: Custom React hooks for data fetching, state caching, and optimistic mutations.
  - `src/lib/`: Typed API client wrappers, formatting helpers, and client-side validation logic.
  - `src/types/`: Shared TypeScript domain definitions and API contracts.

---

## Platform Features

- **Authentication & Account Lifecycle:**
  - Standard email and password signup with a 3-step workflow (email availability check, user details, and 6-digit email OTP verification).
  - Google OAuth 2.0 integration for fast, passwordless onboarding.
  - Session management using secure, signed, `httpOnly` JWT access and refresh cookies.
  - OTP-based password recovery for signed-out users.
  - Profile management with custom avatar uploads via Cloudinary.
  - Cryptographically secure OTP verification for account authentication and recovery.

- **Onboarding & AI Nutrition Profiling:**
  - First-time onboarding questionnaire capturing height, weight, goal weight, age, sex, and physical activity level.
  - Automatic BMI computation and health categorization.
  - AI-generated caloric and macronutrient recommendations using Gemini AI, with strict fallback to the clinically validated Mifflin-St Jeor formula.
  - One-click acceptance that automatically creates the user's initial active daily goal.

- **Daily Goals & Target Tracking:**
  - Configurable daily targets: Calories, Protein (g), Carbohydrates (g), and Fat (g), plus an optional target weight (kg).
  - Dynamic comparison of logged intake against active targets throughout the application.

- **Flexible Meal Logging:**
  - **Single Food Mode:** Fast entry for individual foods with quantity, unit (`g`, `ml`, or `count`), calories, macros, and optional micronutrients.
  - **Meal with Dishes Mode:** Support for multi-dish meals (e.g., "Roti Sabji" containing 2 rotis + 200g paneer sabji), allowing each individual dish to have its own quantity and nutrition while automatically computing overall meal totals.
  - Dynamic micronutrient tracking standardized in milligrams (supports Vitamin C, Iron, Calcium, Potassium, Sodium, etc.).
  - Backdating capability with automatic UTC calendar date alignment.

- **AI-Powered Photo & Nutrition Label Extraction:**
  - Upload photos of cooked meals or packaged nutrition facts labels (supports JPEG, PNG, WebP, HEIC).
  - Multi-class image classification: detects whether an image is a nutrition label, a cooked meal, an unclear image, or not food.
  - Deterministic 4-factor confidence scoring: evaluates Food Identity, Portion Size, Nutrient Accuracy, and Image Quality.
  - Transparent "Why?" confidence breakdown detailing the scoring rubric, applied weights, and confidence adjustments.
  - Interactive preview form allowing users to inspect and adjust extracted dishes and nutrients before confirming.

- **Bulk PDF Food Diary Import:**
  - Upload structured or semi-structured PDF food diaries (up to 5MB and 10 pages).
  - Server-side text extraction paired with Gemini AI to convert raw text into discrete meal entries.
  - Interactive validation table highlighting missing, ambiguous, or estimated values with actionable flags.
  - Automated duplicate detection comparing date, item names, and calories against existing records to prevent double-counting.
  - Batch commit allowing row removal and inline editing prior to database persistence.

- **Conversational AI Assistant:**
  - Full-featured chat assistant with native function calling bound strictly to the authenticated user.
  - Contextual nutrition Q&A and dietary inquiries based on the user's historical data.
  - Conversational food logging ("I had 2 eggs and toast for breakfast") and goal adjustment ("Change my protein target to 150g").
  - "AI Proposes, User Confirms" paradigm: write actions generate interactive proposal cards requiring confirmation before saving.
  - Multimodal support: attach food photos directly into the chat thread for immediate nutritional analysis and logging.
  - Message management: retry failed responses, soft-delete messages, and restore deleted thread items.

- **Dashboard & Health Analytics:**
  - Real-time intake overview showing today's caloric progress dial and macronutrient progress bars.
  - Energy distribution breakdown calculating percentage of calories from protein, carbs, and fat based on standard 4/4/9 multipliers.
  - 7-day interactive trend chart with toggleable metrics (calories, protein, carbs, fat) and a 90%–110% target compliance band.

- **Nutritional Reporting:**
  - Historical analysis over 7-day, 14-day, 30-day, or custom date ranges.
  - Caloric intake graphed directly against the user's target line.
  - Stacked daily or ISO-weekly macronutrient breakdown charts.
  - Summed micronutrient intake reports.

- **User Experience & Accessibility:**
  - Minimalist design aesthetic with semantic nutrient color tokens (Protein: Coral, Carbs: Amber, Fat: Lavender, Calories: Teal).
  - Responsive desktop sidebar with collapsible rail mode and mobile drawer navigation.
  - Persistent Dark / Light theme toggle.

---

## Prerequisites

Before running the application locally, ensure you have the following installed and available:

- **Node.js**: Version `18.0.0` or higher (Node 20+ recommended)
- **npm**: Version `9.0.0` or higher
- **MongoDB**: A running local MongoDB daemon (`mongodb://localhost:27017`) or a [MongoDB Atlas cluster](https://www.mongodb.com/cloud/atlas)
- **Google Cloud Console Account**: For Google OAuth 2.0 Client ID and Secret (if Google login is desired)
- **Google AI Studio API Key**: At least one Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **Resend Account**: An API key from [Resend](https://resend.com/api-keys) for transactional verification emails
- **Cloudinary Account**: Cloud name, API key, and API secret from [Cloudinary](https://cloudinary.com) for profile avatar and chat photo handling

---

## Step-by-Step Setup & Running Guide

### 1. Clone & Install Dependencies

Clone the repository and install the dependencies for both backend and frontend:

```bash
# Clone repository
git clone https://github.com/your-username/intake.git
cd intake

# Install backend dependencies
cd t-backend
npm install

# Install frontend dependencies
cd ../t-frontend
npm install
```

---

### 2. Environment Variables Configuration

#### Backend Configuration (`t-backend/.env`)

Create `t-backend/.env` from the example template:

```bash
cd t-backend
cp .env.example .env
```

Populate the variables in `t-backend/.env`:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Backend server port | `9000` |
| `TRUST_PROXY` | Number of reverse proxies in front of the server, so rate limits see the real client IP. Keep `0` when reached directly | `0` |
| `RATE_LIMIT_ENABLED` | *(Optional)* Set to `false` to disable API rate limiting (the test suite does this) | `true` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/tdb` |
| `JWT_ACCESS_SECRET` | Secret for access tokens (generate with `crypto`) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (must differ from access secret) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EMAIL_SECRET` | Secret for email verification and OTP tokens | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `FRONTEND_URL` | Client origin URL for CORS and redirects | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Web Client Secret | `your-google-client-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect URI | `http://localhost:9000/auth/google/callback` |
| `RESEND_API_KEY` | Resend API key for emails | `re_xxxxxxxxxxxxxxxx` |
| `EMAIL_FROM` | Sender address for emails (`onboarding@resend.dev` for sandbox) | `onboarding@resend.dev` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | `your-cloudinary-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API access key | `your-cloudinary-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-cloudinary-secret` |
| `GEMINI_KEY1` | Primary Gemini API Key | `AIzaSyxxxxxxxxxxxxxxx` |
| `GEMINI_KEY2` ... `GEMINI_KEY4` | *(Optional)* Additional Gemini keys for pool rotation | `AIzaSyxxxxxxxxxxxxxxx` |
| `GEMINI_MODELS` | *(Optional)* Comma-separated Gemini model fallback chain | `gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite` |

#### Frontend Configuration (`t-frontend/.env`)

Create `t-frontend/.env` from the example template:

```bash
cd t-frontend
cp .env.example .env
```

Populate `t-frontend/.env`:

| Variable | Description | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base HTTP endpoint for the backend API | `http://localhost:9000` |

---

### 3. Database Setup

INTAKE uses MongoDB with Mongoose. No manual database migrations or seed scripts are mandatory for a clean start. On startup, Mongoose automatically connects to the database specified by `MONGODB_URI` and creates the necessary collections (`users`, `goals`, `foodentries`, `chatmessages`) along with their respective compound indexes upon first write.

To start a local MongoDB instance:

```bash
# macOS with Homebrew:
brew services start mongodb-community

# Or using Docker:
docker run -d -p 27017:27017 --name intake-mongo mongo:7
```

---

### 4. Third-Party Service Configuration

1. **Google OAuth 2.0:**
   - Visit [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create an **OAuth 2.0 Client ID** configured as a **Web application**.
   - Under **Authorized JavaScript origins**, add: `http://localhost:3000`.
   - Under **Authorized redirect URIs**, add: `http://localhost:9000/auth/google/callback`.
   - Add the resulting Client ID and Secret to `t-backend/.env`.

2. **Resend (Email Service):**
   - Create an account at [Resend](https://resend.com) and generate an API key.
   - For local development, keep `EMAIL_FROM=onboarding@resend.dev` (delivers only to the email registered with your Resend account).
   - For production deployment, verify your domain in Resend and update `EMAIL_FROM` with an address on your verified domain.

3. **Cloudinary (Image Storage):**
   - Create a free account at [Cloudinary](https://cloudinary.com) and retrieve your Cloud Name, API Key, and API Secret from the dashboard.
   - Note: If Cloudinary credentials are omitted, avatar uploads and photo attachments in chat will return `503 Service Unavailable`, but the rest of the application remains fully functional.

4. **Google Gemini AI:**
   - Obtain one or more API keys from [Google AI Studio](https://aistudio.google.com/apikey).
   - Set `GEMINI_KEY1` (and optional `GEMINI_KEY2`, etc.).
   - The backend includes an automated key rotation pool: if a key is rate-limited or fails, the pool transparently fails over to subsequent keys or fallback models.

---

### 5. Running the Application

#### Development Mode

Run the backend and frontend in separate terminal windows:

```bash
# Terminal 1 - Backend Server
cd t-backend
npm run dev
# Server boots on http://localhost:9000
```

```bash
# Terminal 2 - Frontend Application
cd t-frontend
npm run dev
# Next.js web application boots on http://localhost:3000
```

Open your browser and navigate to `http://localhost:3000`.

#### Production Mode

To compile and serve production builds locally:

```bash
# Backend
cd t-backend
npm run build
npm start

# Frontend
cd t-frontend
npm run build
npm start
```

---

### 6. Testing & Utility Scripts

#### Running Automated Tests

The backend includes a comprehensive automated test suite testing auth flows, data isolation, multi-item calculation integrity, PDF import validation, and chat agent function calls:

```bash
cd t-backend
npm test
```

#### Code Quality & Linting

```bash
# Backend linting and formatting
cd t-backend
npm run lint
npm run format

# Frontend linting
cd t-frontend
npm run lint
```

#### Data Migration Scripts

The backend provides standalone migration scripts:

- **Food Entries Migration (Single item to multi-item structure):**
  ```bash
  cd t-backend
  # Dry-run preview:
  npm run migrate:food-items
  # Apply changes:
  npm run migrate:food-items -- --apply
  ```
- **Chat Confirmation Cards Migration:**
  ```bash
  cd t-backend
  # Dry-run preview:
  npm run migrate:chat-confirmations
  # Apply changes:
  npm run migrate:chat-confirmations -- --apply
  ```
- **Goals Versioning Migration (single overwritten goal to dated versions):** Required only when upgrading a database that has goals written before versioning existed; a clean start needs nothing here.
  ```bash
  cd t-backend
  # Dry-run preview:
  npm run migrate:goals-versioned
  # Apply changes:
  npm run migrate:goals-versioned -- --apply
  ```

---

## Application Pages & Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Product landing page highlighting features, capabilities, and call-to-actions. |
| `/login` | Public | User sign-in with email/password credentials or Google OAuth. |
| `/signup` | Public | 3-step registration flow with email availability check and 6-digit OTP verification. |
| `/verify-email` | Public | Email verification landing page for token-based confirmation links. |
| `/forgot-password` | Public | Password recovery flow requesting email and redeeming 6-digit reset OTP. |
| `/onboarding` | Protected | Interactive body profiling (height, weight, age, sex, activity level) and AI goal setup. |
| `/dashboard` | Protected | Core intake hub showing today's calorie dial, macro bars, and 7-day trends. |
| `/goals` | Protected | Manage active daily calorie and macro targets, along with optional goal weight. |
| `/log-meal` | Protected | Log meals via manual entry (single food or multi-dish meal) or AI photo scan. |
| `/meals` | Protected | Filterable, paginated meal history with inline editing, deletion, and date range filters. |
| `/meals/[id]/edit` | Protected | Pre-populated meal editor allowing modification of dishes, items, and nutrients. |
| `/meals/import` | Protected | Bulk PDF diary import: upload, parse, review flagged entries, and batch save. |
| `/chat` | Protected | Interactive nutrition assistant with natural language meal logging and Q&A. |
| `/reports` | Protected | Visual charts for calorie targets, stacked macro trends, and micronutrient intake. |
| `/profile` | Protected | Account overview, body profile metrics, avatar upload, and verification status. |

---

## API Reference

The backend exposes a standardized RESTful API. Complete parameter and response schemas are documented in [API.md](./API.md).

All endpoints return a uniform response envelope:
```jsonc
// Success Response:
{ "success": true, "message": "...", "data": { /* payload */ } }

// Error Response:
{ "success": false, "message": "...", "errors": { "field": ["validation error"] }, "code": "ERROR_CODE" }
```

### Endpoints Overview

#### 1. Authentication & Account Management (`/auth`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/check-email` | No | Check if an email address is available for registration. |
| `POST` | `/auth/register` | No | Register new account and send 6-digit verification code. |
| `POST` | `/auth/signup/resend-otp` | Yes | Resend registration verification OTP to the user's email. |
| `POST` | `/auth/signup/verify-otp` | Yes | Verify email using 6-digit registration OTP code. |
| `POST` | `/auth/login` | No | Authenticate user with credentials and issue JWT cookies. |
| `POST` | `/auth/logout` | No | Invalidate session by clearing authentication cookies. |
| `POST` | `/auth/refresh` | No | Mint a new access token using the refresh cookie. |
| `GET` | `/auth/me` | Yes | Retrieve the currently authenticated user profile. |
| `GET` | `/auth/verify-email` | No | Verify email address via URL query token. |
| `POST` | `/auth/resend-verification`| Yes | Resend verification link email to the current user. |
| `POST` | `/auth/forgot-password` | No | Request 6-digit password reset OTP sent to registered email. |
| `POST` | `/auth/reset-password` | No | Reset password using the 6-digit reset OTP. |
| `PATCH`| `/auth/change-password` | Yes | Change password by verifying the user's current password. |
| `POST` | `/auth/request-otp` | Yes | Request 6-digit OTP for email or password change. |
| `POST` | `/auth/verify-otp` | Yes | Confirm OTP and apply pending email or password update. |
| `POST` | `/auth/avatar` | Yes | Upload user profile picture (`multipart/form-data`). |
| `DELETE`| `/auth/avatar` | Yes | Delete stored profile picture from Cloudinary and user profile. |
| `GET` | `/auth/google` | No | Initiate Google OAuth 2.0 authentication redirect. |
| `GET` | `/auth/google/callback` | No | Google OAuth 2.0 callback destination. |

#### 2. Onboarding & AI Health Profiling (`/api/onboarding`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/onboarding/plan` | Yes | Calculate BMI and generate AI recommended calorie & macro targets. |
| `POST` | `/api/onboarding/complete`| Yes | Save user body profile and set accepted recommended targets as active goal. |

#### 3. Daily Goals (`/api/goals`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/goals` | Yes | Fetch the authenticated user's currently active goal version (`null` if unset). |
| `POST` | `/api/goals` | Yes | Set the goal (calories, macros, optional goal weight), effective today. Closes out the previous version rather than overwriting it, unless it was already set today. |

#### 4. Food Entries & PDF Import (`/api/food-entries`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/food-entries` | Yes | List paginated food entries with date range and meal type filters. |
| `GET` | `/api/food-entries/summary` | Yes | Fetch total calories, macros, and the goal that was active on that specific calendar day. |
| `GET` | `/api/food-entries/series` | Yes | Fetch day-by-day nutritional totals across a date range. |
| `GET` | `/api/food-entries/:id` | Yes | Fetch a single food entry by its ID. |
| `POST` | `/api/food-entries` | Yes | Create a new meal entry with one or more food items. |
| `PATCH`| `/api/food-entries/:id` | Yes | Update an existing food entry owned by the user. |
| `DELETE`| `/api/food-entries/:id`| Yes | Delete a food entry owned by the user. |
| `POST` | `/api/food-entries/import/preview` | Yes | Parse a PDF food diary into reviewable, flagged items (`multipart/form-data`). |
| `POST` | `/api/food-entries/import/confirm` | Yes | Bulk commit reviewed PDF rows, skipping invalid rows and duplicates. |

#### 5. AI Vision Extraction (`/api/ai`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/ai/extract-nutrition` | Yes | Extract draft meal items, macros, and confidence score from a food photo or label. |

#### 6. Nutritional Reports (`/api/reports`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/reports/weekly-calories` | Yes | Retrieve daily caloric intake series across a date range. |
| `GET` | `/api/reports/macros` | Yes | Retrieve protein, carb, and fat distributions grouped by day or ISO week. |
| `GET` | `/api/reports/micros` | Yes | Retrieve aggregated micronutrient totals across a specified date range. |
| `GET` | `/api/reports/goal-comparison` | Yes | Retrieve daily calories paired with the goal target that was active on each specific day (`null` before any goal existed). |

#### 7. Conversational AI Assistant (`/api/chat`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/chat/history` | Yes | Fetch paginated chat thread messages for the user. |
| `POST` | `/api/chat` | Yes | Send a message to the assistant (optional photo attachment via multipart). |
| `POST` | `/api/chat/confirm-action` | Yes | Confirm and execute an assistant action proposal (`logMeal` or `setGoal`). |
| `POST` | `/api/chat/cancel-action` | Yes | Mark a pending chat proposal as cancelled so it is not offered again. |
| `POST` | `/api/chat/messages/:messageId/retry` | Yes | Retry generating a response for the latest failed chat message. |
| `DELETE`| `/api/chat/messages/:messageId` | Yes | Soft-delete a chat message from the user's thread view. |
| `POST` | `/api/chat/messages/:messageId/restore` | Yes | Restore a previously soft-deleted chat message. |

---

## Data Models & Schema Design

### `User` Collection
Represents an account in the system, supporting both local credentials and Google OAuth.
```typescript
{
  email: string;                  // Unique, indexed, required, lowercase
  firstName?: string;             // User given name
  lastName?: string;              // User family name
  password?: string;              // bcrypt hash (present only for local auth)
  emailVerified: boolean;         // Verification status (default: false)
  authProvider: 'local' | 'google';
  googleId?: string;              // Sparse unique index for Google profiles
  profilePicture?: string;        // Cloudinary CDN URL
  profilePicturePublicId?: string;// Cloudinary asset ID for lifecycle management
  bodyProfile?: {
    weightKg: number;             // Current body weight in kilograms
    heightCm: number;             // Height in centimeters
    goalWeightKg?: number;        // Target body weight in kilograms
    age: number;                  // Age in years
    sex: 'male' | 'female';       // Biological sex (for metabolic formula)
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  };
  onboardingCompletedAt?: Date;   // Timestamp of initial onboarding plan acceptance
  otpCode?: string;               // bcrypt-hashed 6-digit OTP code
  otpExpiresAt?: Date;            // OTP expiration timestamp (10-minute window)
  otpPurpose?: 'signup' | 'password_reset' | 'email_change' | 'password_change';
  otpAttempts?: number;           // Failed guess count (invalidated at 5 attempts)
  pendingEmail?: string;          // Staged new email during email update verification
  createdAt: Date;
  updatedAt: Date;
}
```

### `Goal` Collection
One document per goal *version*. Updating a goal does not overwrite the row,
it closes out the current version and opens a new one, so past reports can
still be compared against the target that was actually active on that day.
```typescript
{
  userId: ObjectId;               // Compound unique index on (userId, startDate)
  dailyCalorieTarget: number;     // Target total energy intake (kcal)
  proteinTargetG: number;         // Target protein intake (grams)
  carbTargetG: number;            // Target carbohydrate intake (grams)
  fatTargetG: number;             // Target fat intake (grams)
  weightGoalKg?: number;          // Optional target body weight (kilograms)
  startDate: string;              // YYYY-MM-DD, the first day this version is active
  endDate: string | null;         // YYYY-MM-DD, exclusive end, or null while still active
  createdAt: Date;
  updatedAt: Date;
}
```
A second index, a partial unique index on `userId` where `endDate` is `null`,
guarantees at most one *active* version per user at a time.

### `FoodEntry` Collection
Represents a logged meal or food intake event, composed of one or more food items.
```typescript
{
  userId: ObjectId;               // Indexed, owner reference
  date: Date;                     // Calendar day of consumption (UTC midnight)
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;                   // Meal name (e.g. "Lunch", "Roti Sabji")
  items: [                        // Array of one or more discrete food items
    {
      name: string;               // Item name (e.g., "Roti", "Paneer")
      quantity: number;           // Numeric quantity consumed
      unit: 'g' | 'ml' | 'count'; // Standardized measurement unit
      calories: number;           // Item calories for specified quantity
      macros: {
        proteinG: number;         // Protein in grams
        carbG: number;            // Carbohydrates in grams
        fatG: number;             // Fat in grams
      };
      micros?: Map<string, {      // Keyed micronutrients (e.g. 'iron', 'vitaminC')
        amount: number;
        unit: string;             // Standardized to 'mg'
      }>;
    }
  ];
  calories: number;               // Server-calculated sum of items.calories
  macros: {
    proteinG: number;             // Server-calculated sum of items.macros.proteinG
    carbG: number;                // Server-calculated sum of items.macros.carbG
    fatG: number;                 // Server-calculated sum of items.macros.fatG
  };
  micros?: Map<string, {          // Server-calculated sum of item micronutrients
    amount: number;
    unit: string;
  }>;
  source: 'manual' | 'ai-image' | 'pdf-import' | 'ai-chat';
  imageUrl?: string;              // Cloudinary CDN URL if photo was uploaded on logging
  imagePublicId?: string;         // Cloudinary asset identifier
  confidenceScore?: number;       // Confidence score (0-100) if AI-logged
  confidenceLevel?: 'high' | 'medium' | 'low';
  extractionAnalysis?: any;       // Full AI analysis breakdown if AI-logged
  createdAt: Date;
  updatedAt: Date;
}
```
*Index Strategy:* Compound index on `{ userId: 1, date: -1, createdAt: -1, _id: -1 }` to optimize date-range queries, daily summaries, and deterministic pagination.

### `ChatMessage` Collection
Stores turns of the user's conversational thread with the AI assistant.
```typescript
{
  userId: ObjectId;               // Indexed, owner reference
  role: 'user' | 'assistant';
  content: string;                // Message content text
  imageUrl?: string;              // Cloudinary URL if a photo was attached
  imagePublicId?: string;         // Cloudinary asset ID
  action?: {
    tool: 'logMeal' | 'setGoal' | 'estimateNutrition';
    status: 'pending' | 'confirmed' | 'cancelled' | 'estimate';
    args?: Record<string, any>;   // Validated payload args for pending proposals
  };
  replyError?: {
    message: string;              // Failure message if assistant generation failed
    code?: string;                // Error code (e.g. AI_UNAVAILABLE)
  };
  replyRequestedAt?: Date;        // Timestamp when model generation commenced
  deletedAt?: Date;               // Soft-delete timestamp
  createdAt: Date;
}
```
*Index Strategy:* Compound index on `{ userId: 1, createdAt: -1, _id: -1 }` to support efficient paginated history retrieval.

---

## Architectural & System Assumptions

This section explicitly documents all design decisions and assumptions made across the platform:

### Goals & Target Management

- **Versioned Goals, One Active at a Time:** `POST /api/goals` does not overwrite a user's goal in place. It closes out the currently active version as of today and opens a new one, so each goal document represents a date range (`startDate` to `endDate`, `endDate: null` while active) rather than a single mutable row. A partial unique index enforces exactly one active (`endDate: null`) version per user, and a compound `(userId, startDate)` unique index means editing the goal again on the same day updates that day's version in place instead of stacking up a second entry for it.
- **Explicit Clearing of Optional Weight Target:** When updating goals, omitting `weightGoalKg` clears the existing target weight on that version rather than preserving a stale value, ensuring the document strictly reflects what was submitted.
- **Reports Compare Against the Goal That Was Active on Each Day:** `GET /api/reports/goal-comparison` and the daily summary/series endpoints look up, per day, whichever goal version's `[startDate, endDate)` range covers that date, not the user's current goal. A day before the user's first-ever goal shows a `null` target rather than being backfilled with a later one. This means the same date range can show a step change in the target line if the user changed their goal partway through it, which is intentional: it is what actually happened.
- **No Backdating via the API:** The goal versioning model supports an arbitrary `effectiveDate` internally, but `POST /api/goals` always uses today's date. Scheduling a goal to start on a future date, or correcting when a past goal "really" started, is not exposed and was not asked for.
- **Pre-existing Goals Migrated, Not Reset:** Goal documents created before versioning existed did not have `startDate`/`endDate`. `npm run migrate:goals-versioned -- --apply` (in `t-backend/`) backfills `startDate` from each document's original `createdAt` and `endDate: null`, and swaps the old single-field unique index on `userId` for the two described above. It is idempotent and backs up affected documents before writing.

### Food Entries & Nutritional Modeling

- **Composite Multi-Item Architecture:** Real meals frequently combine foods measured in different ways (e.g., "2 Rotis" counted by piece, alongside "200g Paneer Sabji" measured by weight). In INTAKE, every meal entry contains one or more `items`. A single food entry has one item; a composite meal contains multiple items, each with its own portion and nutritional breakdown.
- **Strict Measurement Units:** Item quantities are strictly restricted to three units: `'g'`, `'ml'`, and `'count'`. Subjective household units (cups, bowls, plates) must be entered as their estimated gram weight or described in the item's name.
- **Server-Authoritative Totals:** Overall meal calories, macros, and micronutrient totals are calculated and stored by the server upon creation or edit. Client-supplied totals are never accepted, preventing any mismatch between itemized totals and parent figures.
- **Milligram Normalization for Micronutrients:** Micronutrients are stored as a key-value map on both items and parent entries. All micronutrient values (`g`, `mg`, `mcg`) are converted and stored in milligrams (`mg`) to ensure accurate summation.
- **Calendar Days Bounded in UTC:** The client transmits dates in `YYYY-MM-DD` format, which the backend anchors to UTC midnight (`00:00:00.000Z`). Queries and daily aggregates query the half-open interval `[midnight UTC, next midnight UTC)`, ensuring reliable day boundaries across timezones.
- **Target Compliance Range (90%–110%):** A day's intake is treated as "on target" if it falls within 90% to 110% of the active target value. Intakes exceeding 110% are marked as exceeding targets.
- **Standard Atwater Energy Calculation:** Macronutrient energy distribution percentages on the dashboard use standard multipliers: 4 kcal per gram of protein, 4 kcal per gram of carbohydrates, and 9 kcal per gram of fat.

### AI Photo & Nutrition Label Extraction

- **In-Memory File Processing:** Uploaded images (up to 8MB) are buffered in memory via `multer.memoryStorage()` during analysis and are never written to temporary disk storage.
- **Deterministic 4-Factor Scoring:** Image confidence is determined mathematically using a weighted formula based on four criteria:
  - *Food Identity* (25% for meals, 20% for labels)
  - *Portion Size* (35% for meals, 25% for labels)
  - *Nutrient Values* (30% for meals, 45% for labels)
  - *Image Quality* (10% for meals, 10% for labels)
  The final score blends 75% of the weighted mean with 25% of the weakest factor to prevent high overall scores when a critical factor is uncertain.
- **Strict Confidence Level Adjustments:** The confidence level (High, Medium, Low) follows deterministic heuristic rules:
  - Nutrition labels start High; meal photos start Medium.
  - User-provided portion descriptions (e.g., "2 slices") elevate meal photos.
  - Low food identity (<60), portion uncertainty (<60), or caloric/macro energy discrepancies (>20%) reduce the confidence level.
  - Caps ensure scores below 60% cannot exceed Medium, and scores below 40% are marked Low.
- **"AI Proposes, Human Confirms":** Extracted nutrition drafts are never automatically saved to the database. They pre-populate the meal form with review warnings, requiring the user to inspect the values and check an explicit review acknowledgment before submitting.
- **Client-Side Image Downscaling:** In-browser canvas downscaling resizes large images to a maximum dimension of 1600px prior to upload, reducing transmission time and API latency while maintaining label readability.

### PDF Food Diary Bulk Import

- **Server-Side Text Extraction:** Text is extracted directly from PDF files on the server using `pdf-parse`. Only raw text is sent to Gemini, avoiding the overhead of multi-page document images.
- **Import Scope Limits:** Imports are limited to 5MB, 10 pages, 50,000 text characters, and a maximum of 100 rows per batch to prevent system exhaustion.
- **Zero-Imputation Policy:** Missing values in a food diary are never guessed or filled in automatically. Rows with missing or ambiguous values are flagged as "Needs Review" in the interactive preview table, requiring manual correction or explicit confirmation before saving.
- **Duplicate Detection Algorithm:** Imported rows are checked for duplicates against the user's existing records and earlier rows in the same PDF using a compound key: UTC date, normalized item names (case and order invariant), and total calories.

### Conversational Assistant & Native Function Calling

**How one message flows (`t-backend/src/services/chatAgent.ts`):**

1. `POST /api/chat` validates the body, resolves the user's local day and time, and stores the user message before calling the model, so the message survives a failed reply.
2. The last 20 stored messages plus the new one become Gemini `contents`. The model is called with the 9 tool declarations: six read tools (`getGoal`, `listMeals`, `getTodaySummary`, `getWeeklySummary`, `getMacroBreakdown`, `getGoalComparison`), two write tools (`logMeal`, `setGoal`) and one estimate tool (`estimateNutrition`).
3. A reply with no function calls is the final answer. Otherwise each call is dispatched (`services/chat/toolDispatch.ts`): read tools run at once against the same services the REST endpoints use, and their results go back to the model for another round.
4. The first valid write or estimate ends the turn without saving anything. Its one-line preview becomes the stored assistant reply and is returned as `pendingAction`.
5. A write is only saved when the user presses Confirm, which calls `POST /api/chat/confirm-action`. That endpoint validates the args again with the exact schema behind `POST /api/food-entries` or `POST /api/goals`, claims the proposal atomically so a double click cannot save twice, and then calls the regular service.

- **A Plain Bounded Loop Instead of an Agent Framework:** The loop is about 60 lines of explicit code rather than LangGraph or LangChain. The tool set is flat, with no branching between steps, parallel sub-agents or long-running resumable workflows, so a framework would add a dependency and hide the control flow without adding capability. Conversation state is a purpose-built `ChatMessage` collection that renders straight into the UI, not a framework checkpoint that has to be decoded. Tests drive the loop with a scripted model (`ConversationTurnGenerator`), so tool dispatch, confirmation and the iteration cap are checked without a network call.
- **Session-Bound Function Calling:** Assistant tools are bound strictly to the authenticated user ID on the server. The AI model has no access to user IDs and cannot query or mutate data across user boundaries.
- **Read Tools Execute Automatically; Every Write Waits for the User:** Queries for data (intake summaries, goal targets, meal history) execute immediately. `logMeal` and `setGoal` only produce a proposal card with Confirm and Cancel, and nothing is written until the user confirms. Cancelling is saved too, so a proposal left undecided (the user switched pages or reloaded) is offered again with Confirm and Cancel when they return. This holds for meals too, so an ambiguous message can never log food on its own. Once confirmed, a meal card turns into a saved receipt.
- **Goal Proposals Carry Only What Changes:** A goal proposal is checked as the complete goal it would produce, but stores only the targets it changes (for example `{ "proteinTargetG": 150 }`). Confirming lays those over the goal as it is at that moment, so an edit made on the Goals page between the proposal and the confirmation is not reverted.
- **Failure Handling Inside a Turn:** Invalid tool arguments, an unknown tool name, or a request-level service error (a 4xx) go back to the model as a tool error, so it can correct the call or ask the user. A tool that runs past 10 seconds, an infrastructure failure, a provider outage, or a model that has not answered after 5 calls ends the turn with a clear error code. The whole turn is capped at 60 seconds. The failure is stored on the user message, which the chat offers to retry.
- **Fresh Start with On-Demand History:** The chat page opens on an empty conversation. Earlier messages stay hidden until "Load previous chats" is pressed, which shows the latest 4; scrolling up to the top loads 4 more at a time. Once opened, history stays on screen while new messages are sent. "New chat" (beside "Photo" in the composer) clears the screen again, but deletes nothing and does not reset the assistant's context. Older pages are fetched with a `before` message id rather than a page number, so messages sent in the meantime never cause repeats or gaps. If a reply was still being produced when the page reloaded, the conversation reopens automatically so the reply is not hidden.
- **Bounded Conversational Context:** To balance contextual memory with latency and token limits, the backend provides the latest 20 stored messages as context for each new turn. Tool calls and tool results made while producing a reply are not stored; only the visible turns are.
- **Known Limitation, Unpruned History:** The stored thread itself is never pruned or summarized. It is paged and indexed, so reading it stays fast, and the model only ever sees the latest 20 messages, but the collection grows for as long as an account is used.
- **Client Date and Time Awareness:** Requests transmit the user's local date (`YYYY-MM-DD`) and time (`HH:MM`) with each turn. The date grounds "today" and "yesterday" in the user's timezone; the time lets "yes, log it" default to the meal matching the time of day. If the date is more than a day away from the server's, both are ignored, and without a time the assistant asks which meal it was.

### Authentication & Account Security

- **Centralized Account Profile:** Identity information, body metrics, membership tenure, and avatar management are unified cleanly within `/profile`.
- **OTP-Gated Credential Updates:**
  - Password changes require a 6-digit OTP delivered to the account's registered email address.
  - Email address updates require a 6-digit OTP delivered to the *new* target email address, confirming inbox ownership before updating the user record.
- **Google OAuth Restrictions:** Accounts authenticated via Google OAuth cannot change passwords or update their email within the app, preventing state desynchronization with Google.
- **Cryptographic, Expiring OTPs:** OTPs are generated via cryptographically secure pseudo-random generators, stored as bcrypt hashes in MongoDB, expire after 10 minutes, and are invalidated after 5 failed verification attempts.
- **Secure Cookie Storage:** Authentication tokens (`access_token` and `refresh_token`) are delivered and stored exclusively via `httpOnly`, `sameSite: "lax"`, secure-ready cookies, mitigating token leakage via Cross-Site Scripting (XSS).

### Multi-Tenant Data Isolation

- **Session-Derived Identity:** Every protected backend endpoint resolves the user identity directly from the verified `access_token` JWT cookie. Client requests cannot supply a `userId` in parameters or bodies to impersonate another user.
- **Strict Query Scoping:** Every database query and aggregation pipeline filters by `{ userId: authenticatedUserId }`.
- **Ownership Verification:** Single-resource operations (`GET`, `PATCH`, `DELETE` on `/api/food-entries/:id`) perform explicit ownership validation, returning `403 Forbidden` if a requested resource belongs to another user.

### API Rate Limiting

Every API request passes through [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit). All policies live in `t-backend/src/lib/rateLimitPolicies.ts`; `t-backend/src/middleware/rateLimit.ts` turns each policy into middleware, and the route files only attach them.

| Policy | Limit | Counts | Applied to |
|---|---|---|---|
| General | 500 requests / 15 min | Every request | All routes except `GET /health` |
| Credential attempts | 10 failures / 15 min | Only failed responses | `POST /auth/login`, `POST /auth/reset-password`, `POST /auth/signup/verify-otp`, `POST /auth/verify-otp`, `PATCH /auth/change-password` |
| Account creation | 20 requests / hour | Every request | `POST /auth/check-email`, `POST /auth/register` |
| Email delivery | 5 requests / hour | Every request | `POST /auth/forgot-password`, `POST /auth/signup/resend-otp`, `POST /auth/resend-verification`, `POST /auth/request-otp` |
| AI requests | 40 requests / 15 min | Every request | `POST /api/ai/extract-nutrition`, `POST /api/chat`, `POST /api/chat/messages/:messageId/retry`, `POST /api/onboarding/plan`, `POST /api/food-entries/import/preview` |
| File uploads | 10 requests / hour | Every request | `POST /auth/avatar` |

- **Who is counted:** Signed-in requests are counted per account, so users behind one shared IP (an office, a mobile carrier) do not use up each other's allowance. Signed-out requests and the general limit are counted per IP, grouping IPv6 addresses by /56 subnet so rotating addresses does not reset the count.
- **Order of checks:** Account-keyed limiters run after `requireAuth` and before file parsing or validation, so a throttled request never costs an upload parse, a database write or a Gemini call.
- **Failures only for credentials:** The credential limit ignores successful responses, so someone who eventually signs in correctly is not locked out, while guessing a password or OTP is capped at 10 tries per 15 minutes. This sits on top of the 5-attempt limit each OTP already enforces.
- **Shared buckets:** Endpoints under the same policy share one counter per client. For example, 5 emails per hour is a total across all email-sending endpoints, not 5 each.
- **Response:** A throttled request returns `429` with the standard error envelope, a `RATE_LIMITED` code and `details.retryAfterSeconds`, plus the standard `RateLimit`, `RateLimit-Policy` and `Retry-After` headers.
- **Proxies:** Behind a load balancer or hosting proxy, set `TRUST_PROXY` to the number of proxy hops. Without it every user appears to share the proxy's IP; setting it too high lets clients spoof their IP through `X-Forwarded-For`.
- **Known limitation, single instance:** Counters are held in memory, so they reset when the server restarts and are not shared between multiple server instances. A horizontally scaled deployment should give each limiter a shared store such as [`rate-limit-redis`](https://github.com/express-rate-limit/rate-limit-redis), which needs no other code changes.
