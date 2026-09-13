import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { setAuthCookies, clearAuthCookies } from '../lib/cookies';
import { verifyRefreshToken } from '../lib/jwt';
import { verifyPassword } from '../lib/password';
import * as signupService from '../services/signup.service';
import { AuthRequest } from '../types';
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
 * Clears auth cookies.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookies(res);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * POST /auth/refresh
 * Issues new access + refresh tokens from a valid refresh token cookie.
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      throw new AppError('No refresh token provided', 401);
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.json({
      success: true,
      message: 'Tokens refreshed',
    });
  } catch (error) {
    clearAuthCookies(res);
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
