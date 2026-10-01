import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AccessTokenClaims, EmailTokenPayload, RefreshTokenClaims, TokenPayload } from '../types';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const EMAIL_SECRET = process.env.JWT_EMAIL_SECRET!;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// --- Auth tokens ---

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

/** Each refresh token gets a unique `jti` so it can be revoked on its own. */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenClaims;
}

// --- Email tokens (stateless verification & password reset) ---

export function generateEmailToken(
  payload: Omit<EmailTokenPayload, 'iat' | 'exp'>,
  expiresIn: string
): string {
  return jwt.sign(payload, EMAIL_SECRET, { expiresIn: expiresIn as unknown as number });
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  return jwt.verify(token, EMAIL_SECRET) as EmailTokenPayload;
}
