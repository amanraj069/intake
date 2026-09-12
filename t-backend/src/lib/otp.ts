import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { SALT_ROUNDS } from './password';

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
/** After this many wrong guesses the code is discarded and must be re-requested. */
export const MAX_OTP_ATTEMPTS = 5;

const OTP_UPPER_BOUND = 10 ** OTP_LENGTH;

/**
 * A six-digit code drawn from the CSPRNG rather than `Math.random`, whose
 * output is predictable from a handful of prior values - enough to guess a
 * code that gates an email or password change.
 */
export function generateOtpCode(): string {
  return randomInt(0, OTP_UPPER_BOUND).toString().padStart(OTP_LENGTH, '0');
}

/** Codes are stored hashed: a leaked database dump must not hand over live codes. */
export function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

export function verifyOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export function isOtpExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}
