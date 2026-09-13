import { API_URL, request } from "./apiClient";
import type { BodyProfile } from "@/types/onboarding";

export interface User {
  id: string;
  email: string;
  /** Null for accounts created before names were collected. */
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  authProvider: "local" | "google";
  avatarUrl: string | null;
  bodyProfile: BodyProfile | null;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface RegistrationInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface RegistrationData extends AuthData {
  /** False when the account exists but the verification code email failed. */
  verificationCodeSent: boolean;
}

interface AuthData {
  user: User;
}

/** Where a requested verification code was actually sent. */
interface OtpDestination {
  sentTo: string;
}

export const authApi = {
  checkEmail: (email: string) =>
    request<{ available: boolean }>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  register: (input: RegistrationInput) =>
    request<RegistrationData>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  resendSignupOtp: () =>
    request<OtpDestination>("/auth/signup/resend-otp", { method: "POST" }),

  confirmSignupOtp: (otp: string) =>
    request<AuthData>("/auth/signup/verify-otp", {
      method: "POST",
      body: JSON.stringify({ otp }),
    }),

  login: (email: string, password: string) =>
    request<AuthData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request("/auth/logout", { method: "POST" }),

  refresh: () => request("/auth/refresh", { method: "POST" }),

  me: () => request<AuthData>("/auth/me"),

  verifyEmail: (token: string) =>
    request(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: () => request("/auth/resend-verification", { method: "POST" }),

  forgotPassword: (email: string) =>
    request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  // --- OTP-gated account changes ---
  //
  // Both changes are a pair of calls: request a code, then redeem it. They are
  // exposed as four named methods rather than one `requestOtp(purpose, ...)`
  // helper so a call site cannot pass a payload the purpose does not accept.

  requestEmailChangeOtp: (newEmail: string) =>
    request<OtpDestination>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ purpose: "change-email", newEmail }),
    }),

  confirmEmailChange: (otp: string) =>
    request<AuthData>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ purpose: "change-email", otp }),
    }),

  requestPasswordChangeOtp: () =>
    request<OtpDestination>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ purpose: "change-password" }),
    }),

  confirmPasswordChange: (otp: string, newPassword: string) =>
    request<AuthData>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ purpose: "change-password", otp, newPassword }),
    }),

  uploadAvatar: (image: File) => {
    const form = new FormData();
    form.append("avatar", image);
    return request<AuthData>("/auth/avatar", { method: "POST", body: form });
  },

  removeAvatar: () => request<AuthData>("/auth/avatar", { method: "DELETE" }),

  // Google OAuth is a full-page redirect, so this returns the URL to navigate to.
  googleAuthUrl: () => `${API_URL}/auth/google`,
};
