import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { clearAuthCookies } from '../lib/cookies';
import { sendOtpEmail } from '../lib/email';
import { hashPassword, verifyPassword } from '../lib/password';
import { generateOtpCode, hashOtpCode, isOtpExpired, otpExpiresAt, verifyOtpCode } from '../lib/otp';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Recovering or rotating a password with a credential already in hand: the OTP
 * mailed to a locked-out user, or the current password of a signed-in one.
 * The OTP-gated change a signed-in user makes without their old password lives
 * in accountSecurity.controller instead.
 */

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
      const otpCode = generateOtpCode();
      user.otpCode = await hashOtpCode(otpCode);
      user.otpExpiresAt = otpExpiresAt();
      user.otpPurpose = 'forgot-password';
      user.otpAttempts = 0;

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

    if (!user.otpCode || !user.otpExpiresAt || isOtpExpired(user.otpExpiresAt)) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const isMatch = await verifyOtpCode(otp, user.otpCode);
    if (!isMatch) {
      throw new AppError('Invalid OTP', 400);
    }

    user.password = await hashPassword(newPassword);
    
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpPurpose = undefined;
    user.otpAttempts = undefined;

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

    const isMatch = await verifyPassword(currentPassword, user.password!);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}
