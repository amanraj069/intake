import { Response } from 'express';
import { generateAccessToken, generateRefreshToken } from './jwt';
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
 */
export function setAuthCookies(res: Response, payload: TokenPayload): void {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Access token - short-lived (15 minutes)
  res.cookie('access_token', accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token - longer-lived (7 days)
  res.cookie('refresh_token', refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clears both auth cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', cookieBase);
  res.clearCookie('refresh_token', cookieBase);
}
