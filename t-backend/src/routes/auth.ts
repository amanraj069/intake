import { Router, Response } from 'express';
import passport from 'passport';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { setAuthCookies } from '../lib/cookies';
import { postAuthRedirectUrl } from '../lib/postAuthRedirect';
import { IUser } from '../types';
import * as authController from '../controllers/auth.controller';
import * as emailVerificationController from '../controllers/emailVerification.controller';
import * as passwordRecoveryController from '../controllers/passwordRecovery.controller';
import * as accountSecurityController from '../controllers/accountSecurity.controller';
import * as avatarController from '../controllers/avatar.controller';
import { uploadAvatarFile } from '../middleware/upload';
import {
  accountCreationRateLimit,
  credentialAttemptsRateLimit,
  emailDeliveryRateLimit,
  fileUploadsRateLimit,
} from '../middleware/rateLimit';
import {
  changePasswordSchema,
  checkEmailSchema,
  confirmSignupOtpSchema,
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

// Rate limiters that key by account sit after `requireAuth`, which is what puts
// the user on the request; on signed-out routes they fall back to the client IP.

router.post(
  '/check-email',
  accountCreationRateLimit,
  validate(checkEmailSchema),
  authController.checkEmail
);
router.post(
  '/register',
  accountCreationRateLimit,
  validate(registerSchema),
  authController.register
);
router.post('/login', credentialAttemptsRateLimit, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', handler(requireAuth), handler(authController.me));

// --- Email verification ---

router.post(
  '/signup/resend-otp',
  handler(requireAuth),
  emailDeliveryRateLimit,
  handler(emailVerificationController.resendSignupOtp)
);
router.post(
  '/signup/verify-otp',
  handler(requireAuth),
  credentialAttemptsRateLimit,
  validate(confirmSignupOtpSchema),
  handler(emailVerificationController.confirmSignupOtp)
);

router.get('/verify-email', emailVerificationController.verifyEmail);
router.post(
  '/resend-verification',
  handler(requireAuth),
  emailDeliveryRateLimit,
  handler(emailVerificationController.resendVerification)
);

// --- Password reset (signed out) ---

router.post(
  '/forgot-password',
  emailDeliveryRateLimit,
  validate(forgotPasswordSchema),
  passwordRecoveryController.forgotPassword
);
router.post(
  '/reset-password',
  credentialAttemptsRateLimit,
  validate(resetPasswordSchema),
  passwordRecoveryController.resetPassword
);

// --- Account security (signed in) ---

router.patch(
  '/change-password',
  handler(requireAuth),
  credentialAttemptsRateLimit,
  validate(changePasswordSchema),
  handler(passwordRecoveryController.changePassword)
);

router.post(
  '/request-otp',
  handler(requireAuth),
  emailDeliveryRateLimit,
  validate(requestAccountOtpSchema),
  handler(accountSecurityController.requestOtp)
);

router.post(
  '/verify-otp',
  handler(requireAuth),
  credentialAttemptsRateLimit,
  validate(verifyAccountOtpSchema),
  handler(accountSecurityController.verifyOtp)
);

// --- Profile picture ---

router.post(
  '/avatar',
  handler(requireAuth),
  fileUploadsRateLimit,
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
    const user = req.user as IUser;
    setAuthCookies(res, { userId: user._id, email: user.email });
    res.redirect(postAuthRedirectUrl(user));
  }
);

export default router;
