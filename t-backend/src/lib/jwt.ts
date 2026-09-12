import jwt from 'jsonwebtoken';
import { TokenPayload, EmailTokenPayload } from '../types';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const EMAIL_SECRET = process.env.JWT_EMAIL_SECRET!;

// --- Auth tokens ---

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' as unknown as number });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' as unknown as number });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

// --- Email tokens (stateless verification & password reset) ---

export function generateEmailToken(
  payload: Omit<EmailTokenPayload, 'iat' | 'exp'>,
  expiresIn: string
): string {
  return jwt.sign(payload, EMAIL_SECRET, { expiresIn: expiresIn as unknown as number });
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  return jwt.verify(token, EMAIL_SECRET) as EmailTokenPayload;
}
