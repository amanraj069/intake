import { Router, Response } from 'express';
import passport from 'passport';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { setAuthCookies } from '../lib/cookies';
import { IUserDocument } from '../models/User';
import * as authController from '../controllers/auth.controller';
import * as emailVerificationController from '../controllers/emailVerification.controller';
import * as passwordRecoveryController from '../controllers/passwordRecovery.controller';
import * as accountSecurityController from '../controllers/accountSecurity.controller';
import * as avatarController from '../controllers/avatar.controller';
import { uploadAvatarFile } from '../middleware/upload';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  requestAccountOtpSchema,
  resetPasswordSchema,
  verifyAccountOtpSchema,
} from '../schemas/auth.schema';

const router = Router();

// `requireAuth` and the authenticated controllers are typed against AuthRequest,
// which Express's RequestHandler does not know about. One shared cast keeps that
// noise out of every route line below.
const handler = (fn: unknown) => fn as import('express').RequestHandler;

// --- Core auth ---

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', handler(requireAuth), handler(authController.me));

// --- Email verification ---

router.get('/verify-email', emailVerificationController.verifyEmail);
router.post(
  '/resend-verification',
  handler(requireAuth),
  handler(emailVerificationController.resendVerification)
);

// --- Password reset (signed out) ---

router.post('/forgot-password', validate(forgotPasswordSchema), passwordRecoveryController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), passwordRecoveryController.resetPassword);

// --- Account security (signed in) ---

router.patch(
  '/change-password',
  handler(requireAuth),
  validate(changePasswordSchema),
  handler(passwordRecoveryController.changePassword)
);

router.post(
  '/request-otp',
  handler(requireAuth),
  validate(requestAccountOtpSchema),
  handler(accountSecurityController.requestOtp)
);

router.post(
  '/verify-otp',
  handler(requireAuth),
  validate(verifyAccountOtpSchema),
  handler(accountSecurityController.verifyOtp)
);

// --- Profile picture ---

router.post(
  '/avatar',
  handler(requireAuth),
  uploadAvatarFile,
  avatarController.uploadAvatar
);

router.delete('/avatar', handler(requireAuth), avatarController.deleteAvatar);

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
