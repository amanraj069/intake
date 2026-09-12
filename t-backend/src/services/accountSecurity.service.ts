import { User, IUserDocument } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { sendOtpEmail } from '../lib/email';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  MAX_OTP_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  otpExpiresAt,
  verifyOtpCode,
} from '../lib/otp';
import type {
  AccountOtpPurpose,
  RequestAccountOtpInput,
  VerifyAccountOtpInput,
} from '../schemas/auth.schema';

/**
 * The OTP-gated account changes: swapping the sign-in email, and setting a new
 * password without having to supply the old one. Both follow the same two
 * steps - request a code, then verify it - and only the verify step commits.
 */

export interface AccountOtpRequestResult {
  /** The address the code went to, so the client can name it back to the user. */
  sentTo: string;
}

async function findAccount(userId: string): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Your account could not be found', 404);
  }
  return user;
}

/**
 * Google accounts have no local credentials to rotate, and their address is
 * owned by Google - letting either change here would desync the two.
 */
function assertLocalCredentials(user: IUserDocument, action: string): void {
  if (user.authProvider === 'google') {
    throw new AppError(
      `This account signs in with Google, so its ${action} is managed by Google.`,
      400
    );
  }
}

async function assertEmailAvailable(address: string, ownerId: IUserDocument['_id']): Promise<void> {
  const taken = await User.exists({ email: address, _id: { $ne: ownerId } });
  if (taken) {
    throw new AppError('That email address is already in use', 409);
  }
}

/**
 * Resolves where the code must go, and for an email change stages the address
 * so the verify step has something to promote. The code goes to the *new*
 * address deliberately: that is the address whose ownership is unproven.
 */
async function prepareDestination(
  user: IUserDocument,
  input: RequestAccountOtpInput
): Promise<string> {
  if (input.purpose === 'change-password') {
    assertLocalCredentials(user, 'password');
    return user.email;
  }

  assertLocalCredentials(user, 'email address');

  const address = input.newEmail.toLowerCase().trim();
  if (address === user.email) {
    throw new AppError('That is already your email address', 400);
  }
  await assertEmailAvailable(address, user._id);

  user.pendingEmail = address;
  return address;
}

function clearOtpState(user: IUserDocument): void {
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  user.otpPurpose = undefined;
  user.otpAttempts = undefined;
  user.pendingEmail = undefined;
}

/**
 * Step one: issue a code. A new request always replaces any code already in
 * flight, which is also how a user recovers from a lost or expired one.
 */
export async function requestAccountOtp(
  userId: string,
  input: RequestAccountOtpInput
): Promise<AccountOtpRequestResult> {
  const user = await findAccount(userId);
  const destination = await prepareDestination(user, input);

  const code = generateOtpCode();
  user.otpCode = await hashOtpCode(code);
  user.otpExpiresAt = otpExpiresAt();
  user.otpPurpose = input.purpose;
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOtpEmail(destination, code, input.purpose);
  } catch (cause) {
    console.error('[AccountSecurity] Could not send OTP email:', cause);
    throw new AppError(
      'We could not send the verification code right now. Please try again in a moment.',
      502
    );
  }

  return { sentTo: destination };
}

/** Rejects a wrong, stale, expired or exhausted code, and burns it on failure. */
async function consumeOtp(
  user: IUserDocument,
  purpose: AccountOtpPurpose,
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

async function applyPendingEmail(user: IUserDocument): Promise<void> {
  if (!user.pendingEmail) {
    throw new AppError('No email change is pending. Start again.', 400);
  }

  // The address could have been claimed by someone else while the code was in
  // flight, so availability is re-checked at the moment of the write.
  await assertEmailAvailable(user.pendingEmail, user._id);

  user.email = user.pendingEmail;
  // Delivering the code to that inbox is itself proof of control.
  user.emailVerified = true;
}

async function applyNewPassword(user: IUserDocument, newPassword: string): Promise<void> {
  assertLocalCredentials(user, 'password');

  if (user.password && (await verifyPassword(newPassword, user.password))) {
    throw new AppError('Your new password must be different from your current one', 400);
  }

  user.password = await hashPassword(newPassword);
}

/** Step two: verify the code and commit the change it was guarding. */
export async function verifyAccountOtp(
  userId: string,
  input: VerifyAccountOtpInput
): Promise<IUserDocument> {
  const user = await findAccount(userId);
  await consumeOtp(user, input.purpose, input.otp);

  if (input.purpose === 'change-email') {
    await applyPendingEmail(user);
  } else {
    await applyNewPassword(user, input.newPassword);
  }

  clearOtpState(user);
  await user.save();

  return user;
}
