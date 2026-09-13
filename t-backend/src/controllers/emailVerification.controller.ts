import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { verifyEmailToken } from '../lib/jwt';
import { sendVerificationEmail } from '../lib/email';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { toUserResponse } from '../lib/userResponse';
import * as signupService from '../services/signup.service';

/**
 * Confirming that the address on an account is real: by a six-digit code during
 * signup, or by the older link in the inbox for accounts verifying later.
 */

/**
 * GET /auth/verify-email?token=...
 * Verifies the email token (stateless JWT) and sets emailVerified = true.
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
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
 * POST /auth/signup/resend-otp
 * Mails a fresh signup verification code to the signed-in, unverified user.
 */
export async function resendSignupOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sentTo = await signupService.resendSignupOtp(req.user!._id);

    res.json({
      success: true,
      message: `Verification code sent to ${sentTo}`,
      data: { sentTo },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/signup/verify-otp
 * Redeems the signup code, marks the email verified, and returns the user.
 */
export async function confirmSignupOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await signupService.confirmSignupOtp(req.user!._id, req.body.otp);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user: toUserResponse(user) },
    });
  } catch (error) {
    next(error);
  }
}
