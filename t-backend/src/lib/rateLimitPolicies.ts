import { HOUR, MINUTE } from 'express-rate-limit';

export interface RateLimitPolicy {
  /** Shown in logs so a throttled request can be traced to the rule that stopped it. */
  name: string;
  windowMs: number;
  maxRequests: number;
  message: string;
  /**
   * Counts only failed responses (status >= 400), so a user who signs in
   * correctly is never locked out by earlier typos on a shared network.
   */
  countFailuresOnly?: boolean;
}

/**
 * Every throttling rule in one place, ordered from broadest to strictest.
 * Limits are sized for a single person using the app normally, with headroom:
 * a real user should never see a 429, while a script hammering an endpoint will.
 */
export const RATE_LIMIT_POLICIES = {
  /** Baseline for every request, a backstop against floods from a single IP. */
  general: {
    name: 'general',
    windowMs: 15 * MINUTE,
    maxRequests: 500,
    message: 'Too many requests. Please slow down and try again shortly.',
  },

  /** Login and secret verification (passwords, OTPs), the brute-force targets. */
  credentialAttempts: {
    name: 'credential-attempts',
    windowMs: 15 * MINUTE,
    maxRequests: 10,
    message: 'Too many failed attempts. Please wait a few minutes before trying again.',
    countFailuresOnly: true,
  },

  /** Account creation and email lookup, which could otherwise enumerate accounts. */
  accountCreation: {
    name: 'account-creation',
    windowMs: HOUR,
    maxRequests: 20,
    message: 'Too many sign-up attempts. Please try again later.',
  },

  /** Anything that sends an email: each one costs money and lands in a real inbox. */
  emailDelivery: {
    name: 'email-delivery',
    windowMs: HOUR,
    maxRequests: 5,
    message: 'Too many emails requested. Please check your inbox or try again in an hour.',
  },

  /** Gemini-backed endpoints, the most expensive calls the backend makes. */
  aiRequests: {
    name: 'ai-requests',
    windowMs: 15 * MINUTE,
    maxRequests: 40,
    message: 'You are sending AI requests too quickly. Please wait a moment and try again.',
  },

  /** Profile picture uploads, which are forwarded to Cloudinary. */
  fileUploads: {
    name: 'file-uploads',
    windowMs: HOUR,
    maxRequests: 10,
    message: 'Too many uploads. Please try again later.',
  },
} satisfies Record<string, RateLimitPolicy>;
