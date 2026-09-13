import { User, IUserDocument } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../lib/password';
import { clearOtpState, consumeOtp, issueOtp } from './otpChallenge.service';
import type { RegisterInput } from '../schemas/auth.schema';

/**
 * Creating a local account and proving its email. Signup is split across
 * screens (email, then details, then a code), so availability is checked up
 * front and re-checked at creation, when it actually matters.
 */

export async function isEmailRegistered(email: string): Promise<boolean> {
  const existing = await User.exists({ email: email.toLowerCase().trim() });
  return existing !== null;
}

export interface RegistrationResult {
  user: IUserDocument;
  /** False when the account was created but the code email could not be sent. */
  verificationCodeSent: boolean;
}

export async function registerLocalUser(input: RegisterInput): Promise<RegistrationResult> {
  if (await isEmailRegistered(input.email)) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create({
    email: input.email.toLowerCase().trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    password: await hashPassword(input.password),
    authProvider: 'local',
    emailVerified: false,
  });

  // The account already exists at this point, so a mail outage must not turn a
  // successful signup into an error. The client is told, and can resend.
  try {
    await issueOtp(user, 'verify-email', user.email);
    return { user, verificationCodeSent: true };
  } catch (cause) {
    console.error('[Signup] Account created but the verification code was not sent:', cause);
    return { user, verificationCodeSent: false };
  }
}

async function findUnverifiedUser(userId: string): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Your account could not be found', 404);
  }
  if (user.emailVerified) {
    throw new AppError('Your email is already verified', 400);
  }
  return user;
}

/** Mails a fresh signup code to the signed-in user's own address. */
export async function resendSignupOtp(userId: string): Promise<string> {
  const user = await findUnverifiedUser(userId);
  await issueOtp(user, 'verify-email', user.email);
  return user.email;
}

export async function confirmSignupOtp(userId: string, otp: string): Promise<IUserDocument> {
  const user = await findUnverifiedUser(userId);
  await consumeOtp(user, 'verify-email', otp);

  user.emailVerified = true;
  clearOtpState(user);
  await user.save();

  return user;
}
