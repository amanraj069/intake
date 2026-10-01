import { Request } from 'express';
import type { IBodyProfile } from '../models/User';

// User document shape (matches Mongoose schema, after .toObject())
export interface IUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  googleId?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  bodyProfile?: IBodyProfile;
  onboardingCompletedAt?: Date;
  createdAt: Date;
}

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: IUser;
}

// JWT payload for access and refresh tokens
export interface TokenPayload {
  userId: string;
  email: string;
  /** Session id shared by every access and refresh token of one sign-in, so logout can revoke them together. */
  sid: string;
}

// Claims of a verified access token: the payload plus what jsonwebtoken adds.
// `sid` is optional because tokens signed before session ids existed lack it.
export interface AccessTokenClaims extends Omit<TokenPayload, 'sid'> {
  sid?: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenClaims extends AccessTokenClaims {
  jti: string;
}

// JWT payload for email-related tokens (verification, password reset)
export interface EmailTokenPayload {
  userId: string;
  email: string;
  purpose: 'verify-email' | 'reset-password';
}

// Consistent API response shape
export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// Augment Express's Request to support our user type
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
