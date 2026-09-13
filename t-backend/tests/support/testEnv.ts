import 'dotenv/config';

/**
 * Imported before anything from `src/`: `lib/jwt` reads its secrets and
 * `lib/passport` reads its Google config at module load, so they must exist
 * first. Real values from `.env` win; placeholders only let the suite run on a
 * machine without one, since no test talks to Google or verifies a real token.
 */
const PLACEHOLDER_ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EMAIL_SECRET: 'test-email-secret',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:9000/auth/google/callback',
};

for (const [key, value] of Object.entries(PLACEHOLDER_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}
