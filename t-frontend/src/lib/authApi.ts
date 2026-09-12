import { API_URL, request } from "./apiClient";

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  authProvider: "local" | "google";
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthData {
  user: User;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthData>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

  changePassword: (currentPassword: string, newPassword: string) =>
    request("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  requestOtp: (purpose: "change-email" | "change-password", newEmail?: string) =>
    request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ purpose, newEmail }),
    }),

  verifyOtp: (purpose: "change-email" | "change-password", otp: string, newPassword?: string) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ purpose, otp, newPassword }),
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
