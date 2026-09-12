# INTAKE

## Architecture

```
p1/
├── t-frontend/    Next.js (App Router) + TypeScript + Tailwind CSS
├── t-backend/     Express + TypeScript + MongoDB/Mongoose
└── README.md
```

## Features

- **Email + password auth** - bcrypt hashing, JWT access/refresh tokens in httpOnly cookies
- **Google OAuth** - Passport.js with `passport-google-oauth20`
- **Email verification** - stateless JWT tokens sent via Resend
- **Password reset** - stateless JWT tokens sent via Resend
- **User profile** - account details, change password, resend verification
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

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000` to **Authorized JavaScript origins**
4. Add `http://localhost:9000/auth/google/callback` to **Authorized redirect URIs**
5. Copy the Client ID and Client Secret to your backend `.env`

### 4. Set up Resend

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from [resend.com/api-keys](https://resend.com/api-keys)
3. Add it to `RESEND_API_KEY` in your backend `.env`
4. For local development, `EMAIL_FROM=onboarding@resend.dev` works with the sandbox (emails go to your Resend dashboard)
5. For production, verify a domain and use an address on that domain

### 5. Run both servers

```bash
# Terminal 1 - Backend
cd t-backend
npm run dev        # http://localhost:9000

# Terminal 2 - Frontend
cd t-frontend
npm run dev        # http://localhost:3000
```

---

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | - | Create account |
| `POST` | `/auth/login` | - | Sign in |
| `POST` | `/auth/logout` | - | Sign out (clears cookies) |
| `POST` | `/auth/refresh` | - | Refresh access token |
| `GET` | `/auth/me` | ✓ | Get current user |
| `GET` | `/auth/verify-email?token=` | - | Verify email |
| `POST` | `/auth/resend-verification` | ✓ | Resend verification email |
| `POST` | `/auth/forgot-password` | - | Request password reset |
| `POST` | `/auth/reset-password` | - | Reset password with token |
| `PATCH` | `/auth/change-password` | ✓ | Change password |
| `GET` | `/auth/google` | - | Start Google OAuth |
| `GET` | `/auth/google/callback` | - | Google OAuth callback |

## Data Model

Single `User` collection:

```
email:          string (unique, required)
password:       string (optional - only for local auth)
emailVerified:  boolean (default: false)
authProvider:   'local' | 'google'
googleId:       string (optional, sparse unique index)
createdAt:      Date
```

No other collections. Email verification and password reset use stateless JWTs.
# intake
