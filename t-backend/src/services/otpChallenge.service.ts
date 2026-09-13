import { IUserDocument, OtpPurpose } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { sendOtpEmail } from '../lib/email';
import {
  MAX_OTP_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  otpExpiresAt,
  verifyOtpCode,
} from '../lib/otp';

/**
 * The code-in-the-inbox challenge shared by every OTP-gated flow (signup
 * verification, email change, password change). Each flow decides where the
 * code goes and what a verified code unlocks; this module owns issuing,
 * rate-limiting and burning the code itself.
 */

export function clearOtpState(user: IUserDocument): void {
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  user.otpPurpose = undefined;
  user.otpAttempts = undefined;
  user.pendingEmail = undefined;
}

/**
 * Stores a fresh hashed code on the user and mails it. A new code always
 * replaces one already in flight, which is how a lost or expired code is
 * recovered. The caller must have staged any other changes on `user` first,
 * since they are saved together.
 */
export async function issueOtp(
  user: IUserDocument,
  purpose: OtpPurpose,
  destination: string
): Promise<void> {
  const code = generateOtpCode();
  user.otpCode = await hashOtpCode(code);
  user.otpExpiresAt = otpExpiresAt();
  user.otpPurpose = purpose;
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOtpEmail(destination, code, purpose);
  } catch (cause) {
    console.error(`[OTP] Could not send ${purpose} code:`, cause);
    throw new AppError(
      'We could not send the verification code right now. Please try again in a moment.',
      502
    );
  }
}

/** Rejects a wrong, stale, expired or exhausted code, and burns it on failure. */
export async function consumeOtp(
  user: IUserDocument,
  purpose: OtpPurpose,
  submittedCode: string
): Promise<void> {
  if (!user.otpCode || !user.otpExpiresAt || user.otpPurpose !== purpose) {
    throw new AppError('No verification code is pending. Request a new one.', 400);
  }

  if (isOtpExpired(user.otpExpiresAt)) {
    clearOtpState(user);
    await user.save();
    throw new AppError('That verification code has expired. Request a new one.', 400);
  }

  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    clearOtpState(user);
    await user.save();
    throw new AppError('Too many incorrect attempts. Request a new code.', 429);
  }

  const matches = await verifyOtpCode(submittedCode, user.otpCode);
  if (!matches) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save();
    throw new AppError('That verification code is not correct', 400);
  }
}
