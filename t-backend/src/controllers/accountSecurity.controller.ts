import { Response, NextFunction } from 'express';
import { setAuthCookies } from '../lib/cookies';
import { AuthRequest } from '../types';
import { toUserResponse } from '../lib/userResponse';
import * as accountSecurity from '../services/accountSecurity.service';
import type {
  RequestAccountOtpInput,
  VerifyAccountOtpInput,
} from '../schemas/auth.schema';

/** The two-step, OTP-gated changes to a signed-in account's email and password. */

/**
 * POST /auth/request-otp
 * Starts an OTP-gated account change. `change-email` mails the code to the
 * proposed address; `change-password` mails it to the address on file.
 */
export async function requestOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as RequestAccountOtpInput;
    const { sentTo } = await accountSecurity.requestAccountOtp(req.user!._id.toString(), input);

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
 * POST /auth/verify-otp
 * Completes the change the code was guarding and returns the updated user.
 */
export async function verifyOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as VerifyAccountOtpInput;
    const user = await accountSecurity.verifyAccountOtp(req.user!._id.toString(), input);

    // The access token carries the email, so it has to be reissued once that
    // email changes - otherwise the session keeps presenting the old address.
    setAuthCookies(res, { userId: user._id.toString(), email: user.email });

    res.json({
      success: true,
      message:
        input.purpose === 'change-email'
          ? 'Email address updated'
          : 'Password updated',
      data: { user: toUserResponse(user) },
    });
  } catch (error) {
    next(error);
  }
}
