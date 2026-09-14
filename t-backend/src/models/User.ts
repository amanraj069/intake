import mongoose, { Schema, Document } from 'mongoose';

export const BIOLOGICAL_SEXES = ['male', 'female'] as const;
export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very-active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export type OtpPurpose = 'verify-email' | 'change-email' | 'change-password' | 'forgot-password';

/** The body measurements a nutrition plan is derived from, captured at onboarding. */
export interface IBodyProfile {
  weightKg: number;
  heightCm: number;
  goalWeightKg: number;
  age: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
}

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
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
  otpCode?: string;
  otpExpiresAt?: Date;
  otpPurpose?: OtpPurpose;
  otpAttempts?: number;
  otpResentAt?: Date;
  pendingEmail?: string;
}

const bodyProfileSchema = new Schema<IBodyProfile>(
  {
    weightKg: { type: Number, required: true, min: 0 },
    heightCm: { type: Number, required: true, min: 0 },
    goalWeightKg: { type: Number, required: true, min: 0 },
    age: { type: Number, required: true, min: 0 },
    sex: { type: String, enum: BIOLOGICAL_SEXES, required: true },
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional at the schema level: accounts created before names were collected
    // have none, and the client falls back to the email's local part for them.
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    password: {
      type: String,
      // Only required for local auth; Google users won't have a password
      required: function (this: IUserDocument) {
        return this.authProvider === 'local';
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
      default: 'local',
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    avatarUrl: String,
    // Kept alongside the URL so a replaced or removed avatar can be destroyed
    // in Cloudinary rather than left orphaned in the account's media library.
    avatarPublicId: String,
    bodyProfile: bodyProfileSchema,
    // A timestamp rather than a boolean so it also records when the plan was set.
    onboardingCompletedAt: Date,
    otpCode: String,
    otpExpiresAt: Date,
    otpPurpose: {
      type: String,
      enum: ['verify-email', 'change-email', 'change-password', 'forgot-password'],
    },
    // Wrong guesses against the current code, so a six-digit secret cannot be
    // brute-forced across its ten-minute window.
    otpAttempts: Number,
    otpResentAt: Date,
    // The address a change-email code was sent to, promoted to `email` only
    // once that code is verified.
    pendingEmail: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const User = mongoose.model<IUserDocument>('User', userSchema);
