import { Response } from 'express';
import { generateAccessToken, generateRefreshToken } from './jwt';
import { TokenPayload } from '../types';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sets httpOnly, secure, sameSite cookies for both access and refresh tokens.
 */
export function setAuthCookies(res: Response, payload: TokenPayload): void {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Access token - short-lived (15 minutes)
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  // Refresh token - longer-lived (7 days)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clears both auth cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}
