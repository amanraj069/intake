import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { setAuthCookies, clearAuthCookies } from '../lib/cookies';
import { verifyRefreshToken, verifyEmailToken } from '../lib/jwt';
import {
  sendVerificationEmail,
  sendOtpEmail,
} from '../lib/email';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;

/**
 * POST /auth/register
 * Creates a new local user, sends verification email, sets auth cookies.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      authProvider: 'local',
      emailVerified: false,
    });

    // Send verification email (non-blocking - don't fail registration if email fails)
    sendVerificationEmail(user).catch((err) => {
      console.error('[Email] Failed to send verification email:', err);
    });

    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your address.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
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

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
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
  res.json({
    success: true,
    message: 'User retrieved',
    data: {
      user: req.user,
    },
  });
}

/**
 * GET /auth/verify-email?token=...
 * Verifies the email token (stateless JWT) and sets emailVerified = true.
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is required', 400);
    }

    const payload = verifyEmailToken(token);
    if (payload.purpose !== 'verify-email') {
      throw new AppError('Invalid token purpose', 400);
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      res.json({
        success: true,
        message: 'Email is already verified',
      });
      return;
    }

    user.emailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch {
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token',
    });
  }
}

/**
 * POST /auth/resend-verification
 * Re-sends the verification email for the currently logged-in user.
 */
export async function resendVerification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      res.json({
        success: true,
        message: 'Email is already verified',
      });
      return;
    }

    await sendVerificationEmail(user);

    res.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/forgot-password
 * Sends a password reset OTP. Always responds success (don't leak account existence).
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    // Always respond success - don't leak whether the email exists
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpCode = await bcrypt.hash(otpCode, SALT_ROUNDS);
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      user.otpPurpose = 'forgot-password';
      
      await user.save();

      sendOtpEmail(user.email, otpCode, 'forgot-password').catch((err) => {
        console.error('[Email] Failed to send password reset OTP:', err);
      });
    } else {
      console.log(`[Auth] Password reset requested for unknown address: ${email}`);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/reset-password
 * Verifies the OTP and sets a new password.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't leak user existence
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (user.otpPurpose !== 'forgot-password') {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const isMatch = await bcrypt.compare(otp, user.otpCode);
    if (!isMatch) {
      throw new AppError('Invalid OTP', 400);
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Clear OTP fields
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpPurpose = undefined;

    await user.save();

    // Clear any existing sessions by not setting new cookies
    clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/request-otp
 */
export async function requestOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { purpose, newEmail } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user) throw new AppError('User not found', 404);

    if (purpose === 'change-email') {
      if (!newEmail) throw new AppError('New email is required', 400);
      const existing = await User.findOne({ email: newEmail.toLowerCase() });
      if (existing) throw new AppError('Email already in use', 409);
      user.pendingEmail = newEmail.toLowerCase();
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = await bcrypt.hash(otpCode, SALT_ROUNDS);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    user.otpPurpose = purpose;
    
    await user.save();

    const sendTo = purpose === 'change-email' ? user.pendingEmail! : user.email;
    await sendOtpEmail(sendTo, otpCode, purpose);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/verify-otp
 */
export async function verifyOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { otp, purpose, newPassword } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user) throw new AppError('User not found', 404);

    if (user.otpPurpose !== purpose) throw new AppError('Invalid OTP purpose', 400);
    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError('OTP expired or invalid', 400);
    }

    const isMatch = await bcrypt.compare(otp, user.otpCode);
    if (!isMatch) throw new AppError('Invalid OTP', 400);

    // OTP is valid, perform the action
    if (purpose === 'change-email') {
      if (!user.pendingEmail) throw new AppError('No pending email found', 400);
      user.email = user.pendingEmail;
      user.emailVerified = true;
    } else if (purpose === 'change-password') {
      if (!newPassword) throw new AppError('New password is required', 400);
      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    // Clear OTP fields
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpPurpose = undefined;
    user.pendingEmail = undefined;

    await user.save();

    // Since critical account info changed, they should remain logged in.
    // If email changed, they might want a fresh cookie, but the ID hasn't changed.
    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /auth/change-password
 * Changes the password for the currently logged-in user (local auth only).
 */
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.authProvider === 'google' && !user.password) {
      throw new AppError('Google accounts cannot change password', 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password!);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}
