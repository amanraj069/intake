import { Resend } from 'resend';
import { IUserDocument } from '../models/User';
import { generateEmailToken } from './jwt';

// Get the API key lazily so dotenv has time to load
const getResend = () => new Resend(process.env.RESEND_API_KEY);

// Default to Resend's sandbox address for local development.
// For production, set EMAIL_FROM to an address on a verified domain.
const getEmailFrom = () => process.env.EMAIL_FROM || 'onboarding@resend.dev';
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Thin wrapper around Resend's send call.
 *
 * The Resend SDK resolves with `{ data, error }` instead of rejecting when the
 * API refuses a message (unverified domain, invalid key, sandbox restriction).
 * Without this check a failed send looks identical to a successful one, so
 * callers silently report success and nothing ever reaches the dashboard.
 */
async function send(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set - cannot send email.');
  }

  const { data, error } = await getResend().emails.send({
    from: getEmailFrom(),
    ...payload,
  });

  if (error) {
    throw new Error(
      `Resend rejected the message to ${payload.to}: ${error.name} - ${error.message}`
    );
  }

  console.log(`[Email] Sent "${payload.subject}" to ${payload.to} (id: ${data?.id})`);
}

/**
 * Sends a verification email with a stateless JWT link (~24h expiry).
 */
export async function sendVerificationEmail(user: IUserDocument): Promise<void> {
  const token = generateEmailToken(
    {
      userId: user._id.toString(),
      email: user.email,
      purpose: 'verify-email',
    },
    '24h'
  );

  const verifyUrl = `${getFrontendUrl()}/verify-email?token=${token}`;

  await send({
    to: user.email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0A0A0A; margin-bottom: 16px;">Verify your email</h1>
        <p style="font-size: 16px; color: #6B7280; line-height: 1.6; margin-bottom: 32px;">
          Click the button below to verify your email address. This link expires in 24 hours.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #E8432D; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; letter-spacing: 0.05em; text-transform: uppercase;">
          VERIFY EMAIL
        </a>
        <p style="font-size: 13px; color: #9CA3AF; margin-top: 32px; line-height: 1.5;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}


type OtpPurpose = 'change-email' | 'change-password' | 'forgot-password';

/**
 * Each purpose reads differently to the recipient: a reset is something they
 * asked for while locked out, whereas a change-password code lands in the inbox
 * of someone already signed in - where identical wording would look like a
 * phishing attempt rather than the action they just took.
 */
const OTP_COPY: Record<OtpPurpose, { subject: string; title: string; description: string }> = {
  'change-email': {
    subject: 'Verify your new email address',
    title: 'Verify your new email',
    description:
      'Use the code below to confirm this address for your INTAKE account. It expires in 10 minutes.',
  },
  'change-password': {
    subject: 'Confirm your password change',
    title: 'Confirm your password change',
    description:
      'Use the code below to finish setting a new password. It expires in 10 minutes.',
  },
  'forgot-password': {
    subject: 'Reset your password',
    title: 'Reset your password',
    description: 'Use the code below to reset your password. It expires in 10 minutes.',
  },
};

/** Sends a 6-digit OTP for a password reset or an OTP-gated account change. */
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  purpose: OtpPurpose
): Promise<void> {
  const { subject, title, description } = OTP_COPY[purpose];

  await send({
    to: toEmail,
    subject,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0A0A0A; margin-bottom: 16px;">${title}</h1>
        <p style="font-size: 16px; color: #6B7280; line-height: 1.6; margin-bottom: 32px;">
          ${description}
        </p>
        <div style="background-color: #F3F4F6; padding: 24px; text-align: center; border: 1px solid #E5E7EB; letter-spacing: 0.5em; font-size: 32px; font-weight: 800; color: #0A0A0A; margin-bottom: 32px;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #9CA3AF; margin-top: 32px; line-height: 1.5;">
          If you didn't request this code, you can safely ignore this email - no change has been made.
        </p>
      </div>
    `,
  });
}
