import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { setAuthCookies, clearAuthCookies } from '../lib/cookies';
import { verifyAccessToken, verifyRefreshToken } from '../lib/jwt';
import {
  consumeRefreshToken,
  revokeAllSessions,
  revokeSession,
} from '../services/sessionRevocation.service';
import { verifyPassword } from '../lib/password';
import * as signupService from '../services/signup.service';
import { AuthRequest, RefreshTokenClaims } from '../types';
import { AppError } from '../middleware/errorHandler';
import { toUserResponse } from '../lib/userResponse';

/** Establishing and ending a session: who you are and how you prove it. */

/**
 * POST /auth/check-email
 * Step one of signup: tells the client whether an address is free to register.
 */
export async function checkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const registered = await signupService.isEmailRegistered(req.body.email);

    res.json({
      success: true,
      message: registered ? 'An account with this email already exists' : 'Email is available',
      data: { available: !registered },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/register
 * Creates a local user with their name, mails a signup verification code, and
 * signs them in.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, verificationCodeSent } = await signupService.registerLocalUser(req.body);

    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.status(201).json({
      success: true,
      message: verificationCodeSent
        ? `Account created. We sent a verification code to ${user.email}.`
        : 'Account created, but we could not send your verification code. Try resending it.',
      data: {
        user: toUserResponse(user),
        verificationCodeSent,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/login
 * Authenticates a local user by email + password, sets auth cookies.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.authProvider === 'google' && !user.password) {
      throw new AppError(
        'This account uses Google sign-in. Please use "Continue with Google" to log in.',
        400
      );
    }

    const isMatch = await verifyPassword(password, user.password!);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: toUserResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/logout
 * Revokes the session, so neither its access token nor its refresh token can
 * be replayed from a copied cookie, and clears auth cookies.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  await revokePresentedSession(req.cookies);
  clearAuthCookies(res);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * POST /auth/logout-other-devices
 * Signs out every other session of the user. This one is reissued fresh tokens
 * in the same second as the cutoff, which the cutoff check lets through, so it
 * stays signed in.
 */
export async function logoutOtherDevices(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { _id: userId, email } = req.user!;
    await revokeAllSessions(userId);
    setAuthCookies(res, { userId, email });

    res.json({
      success: true,
      message: 'Signed out of all other devices',
    });
  } catch (error) {
    next(error);
  }
}

/** Both cookies carry the session id; the access token is the fallback when the refresh cookie is gone. */
function presentedSessionId(cookies: Record<string, string | undefined>): string | undefined {
  const verifiers = [
    () => verifyRefreshToken(cookies.refresh_token ?? ''),
    () => verifyAccessToken(cookies.access_token ?? ''),
  ];
  for (const verify of verifiers) {
    try {
      const { sid } = verify();
      if (sid) return sid;
    } catch {
      // An absent or expired cookie: try the other one.
    }
  }
  return undefined;
}

/**
 * Logout must always succeed for the user, so a session that cannot be
 * identified, or an unreachable session store, is logged and the cookies are
 * cleared anyway.
 */
async function revokePresentedSession(cookies: Record<string, string | undefined> = {}): Promise<void> {
  const sessionId = presentedSessionId(cookies);
  if (!sessionId) {
    console.warn('[Auth] Logout without a valid session token, nothing to revoke');
    return;
  }
  try {
    await revokeSession(sessionId);
  } catch (error) {
    console.warn(`[Auth] Logout could not revoke session: ${(error as Error).message}`);
  }
}

/** A missing, forged or expired refresh token is an auth failure (401), not a server error. */
function readRefreshClaims(token: string | undefined): RefreshTokenClaims {
  if (!token) throw new AppError('No refresh token provided', 401);
  try {
    return verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

/**
 * POST /auth/refresh
 * Exchanges a valid, unrevoked refresh token cookie for new access + refresh
 * tokens. The presented refresh token is retired (rotation).
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = readRefreshClaims(req.cookies?.refresh_token);
    const user = await User.findById(claims.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    await consumeRefreshToken(claims);
    // Tokens signed before session ids existed have no sid; they start a new session here.
    setAuthCookies(res, { userId: user._id.toString(), email: user.email }, claims.sid);

    res.json({
      success: true,
      message: 'Tokens refreshed',
    });
  } catch (error) {
    // A 503 means the session store is down, not that the session is invalid,
    // so the cookies are kept for the client's retry.
    if (!(error instanceof AppError && error.statusCode === 503)) clearAuthCookies(res);
    next(error);
  }
}

/**
 * GET /auth/me
 * Returns the currently authenticated user.
 */
export async function me(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  res.json({
    success: true,
    message: 'User retrieved',
    data: {
      user: toUserResponse(req.user),
    },
  });
}
