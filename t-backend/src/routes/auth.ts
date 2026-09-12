import { Router, Request, Response } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { setAuthCookies } from '../lib/cookies';
import { IUserDocument } from '../models/User';
import * as authController from '../controllers/auth.controller';

const router = Router();

// --- Validation schemas ---

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must be at most 128 characters'),
  }),
});

const requestOtpSchema = z.object({
  body: z.object({
    purpose: z.enum(['change-email', 'change-password']),
    newEmail: z.string().email('Invalid email address').optional(),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    purpose: z.enum(['change-email', 'change-password']),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .optional(),
  }),
});

// --- Core auth routes ---

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void, authController.me as unknown as (req: Request, res: Response) => void);

// --- Email verification ---

router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', requireAuth as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void, authController.resendVerification as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void);

// --- Password reset ---

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.patch(
  '/change-password',
  requireAuth as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void,
  validate(changePasswordSchema),
  authController.changePassword as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void
);

router.post(
  '/request-otp',
  requireAuth as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void,
  validate(requestOtpSchema),
  authController.requestOtp as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void
);

router.post(
  '/verify-otp',
  requireAuth as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void,
  validate(verifyOtpSchema),
  authController.verifyOtp as unknown as (req: Request, res: Response, next: import('express').NextFunction) => void
);

// --- Google OAuth ---

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res: Response) => {
    const user = req.user as unknown as IUserDocument;
    setAuthCookies(res, { userId: user._id.toString(), email: user.email });
    res.redirect(`${process.env.FRONTEND_URL}/profile`);
  }
);

export default router;
