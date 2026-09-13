import type { IBodyProfile } from '../models/User';

/** The only user shape the API ever sends to a client. */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  avatarUrl: string | null;
  bodyProfile: IBodyProfile | null;
  onboardingCompleted: boolean;
  createdAt: Date;
}

interface SerializableUser {
  _id: { toString(): string };
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  avatarUrl?: string;
  bodyProfile?: IBodyProfile;
  onboardingCompletedAt?: Date;
  createdAt: Date;
}

/** Copies the subdocument field by field so no Mongoose internals leak into the JSON. */
function toBodyProfileResponse(profile: IBodyProfile): IBodyProfile {
  return {
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    goalWeightKg: profile.goalWeightKg,
    age: profile.age,
    sex: profile.sex,
    activityLevel: profile.activityLevel,
  };
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
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl ?? null,
    bodyProfile: user.bodyProfile ? toBodyProfileResponse(user.bodyProfile) : null,
    onboardingCompleted: Boolean(user.onboardingCompletedAt),
    createdAt: user.createdAt,
  };
}
