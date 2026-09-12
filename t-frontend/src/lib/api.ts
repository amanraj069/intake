const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status, data.errors);
  }

  return data;
}

// --- Auth API ---

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  createdAt: string;
}

interface AuthData {
  user: User;
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request<AuthData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  refresh: () =>
    request('/auth/refresh', { method: 'POST' }),

  me: () =>
    request<AuthData>('/auth/me'),

  // Email verification
  verifyEmail: (token: string) =>
    request(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: () =>
    request('/auth/resend-verification', { method: 'POST' }),

  // Password
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  requestOtp: (purpose: 'change-email' | 'change-password', newEmail?: string) =>
    request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ purpose, newEmail }),
    }),

  verifyOtp: (purpose: 'change-email' | 'change-password', otp: string, newPassword?: string) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ purpose, otp, newPassword }),
    }),

  // Google OAuth - just returns the redirect URL
  googleAuthUrl: () => `${API_URL}/auth/google`,
};

export { ApiError };
