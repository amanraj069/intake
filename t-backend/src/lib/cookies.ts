import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  generateAccessToken,
  generateRefreshToken,
} from './jwt';
import { TokenPayload } from '../types';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Shared cookie options for cross-site auth.
 * In production the frontend and backend live on different registrable
 * domains (cross-site), so we must use sameSite: 'none' + secure: true
 * for the browser to store and send the cookies on cross-origin requests.
 */
const cookieBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
} as const;

/**
 * Sets httpOnly, secure, sameSite cookies for both access and refresh tokens.
 * Omitting `sessionId` starts a new session (a sign-in); a refresh passes the
 * current one so the session can still be revoked as a whole.
 */
export function setAuthCookies(
  res: Response,
  user: Omit<TokenPayload, 'sid'>,
  sessionId: string = randomUUID()
): void {
  const payload: TokenPayload = { ...user, sid: sessionId };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie('access_token', accessToken, {
    ...cookieBase,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieBase,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

/**
 * Clears both auth cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', cookieBase);
  res.clearCookie('refresh_token', cookieBase);
}
