import { z } from 'zod';
import { OTP_LENGTH } from '../lib/otp';

const emailField = z.string().email('Enter a valid email address');

const newPasswordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

const otpField = z
  .string()
  .length(OTP_LENGTH, `Code must be exactly ${OTP_LENGTH} digits`)
  .regex(/^\d+$/, 'Code must contain digits only');

export const registerSchema = z.object({
  body: z.object({
    email: emailField,
    password: newPasswordField,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailField,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailField,
    otp: otpField,
    newPassword: newPasswordField,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: newPasswordField,
  }),
});

/**
 * The two OTP-gated account changes carry different payloads, so they are
 * modelled as a discriminated union: "a new email is required to change your
 * email" becomes a schema rule instead of a hand-written check in the service.
 */
export const requestAccountOtpSchema = z.object({
  body: z.discriminatedUnion('purpose', [
    z.object({ purpose: z.literal('change-email'), newEmail: emailField }),
    z.object({ purpose: z.literal('change-password') }),
  ]),
});

export const verifyAccountOtpSchema = z.object({
  body: z.discriminatedUnion('purpose', [
    z.object({ purpose: z.literal('change-email'), otp: otpField }),
    z.object({
      purpose: z.literal('change-password'),
      otp: otpField,
      newPassword: newPasswordField,
    }),
  ]),
});

export type RequestAccountOtpInput = z.infer<typeof requestAccountOtpSchema>['body'];
export type VerifyAccountOtpInput = z.infer<typeof verifyAccountOtpSchema>['body'];
export type AccountOtpPurpose = RequestAccountOtpInput['purpose'];
