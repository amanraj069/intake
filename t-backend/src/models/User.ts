import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  googleId?: string;
  createdAt: Date;
  otpCode?: string;
  otpExpiresAt?: Date;
  otpPurpose?: 'change-email' | 'change-password' | 'forgot-password';
  pendingEmail?: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
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
    otpCode: String,
    otpExpiresAt: Date,
    otpPurpose: {
      type: String,
      enum: ['change-email', 'change-password', 'forgot-password'],
    },
    pendingEmail: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const User = mongoose.model<IUserDocument>('User', userSchema);
