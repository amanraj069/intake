/** The only user shape the API ever sends to a client. */
export interface UserResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  avatarUrl: string | null;
  createdAt: Date;
}

interface SerializableUser {
  _id: { toString(): string };
  email: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  avatarUrl?: string;
  createdAt: Date;
}

/**
 * Whitelists the fields a client may see. Serializing through here keeps
 * credential and OTP state (`password`, `otpCode`, `pendingEmail`) off every
 * response by construction instead of relying on each handler to omit them.
 */
export function toUserResponse(user: SerializableUser): UserResponse {
  return {
    id: user._id.toString(),
    email: user.email,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  };
}
