"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, type RegistrationInput, type User, ApiError } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Resolves with whether the verification code email was actually sent. */
  signup: (input: RegistrationInput) => Promise<{ verificationCodeSent: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Adopts a user an API call already returned, saving a round trip to /auth/me. */
  setSessionUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => ({ verificationCodeSent: false }),
  logout: async () => {},
  refreshUser: async () => {},
  setSessionUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount (from httpOnly cookie)
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      const u = res.data?.user ?? null;
      setUser(u);
      // Remember the email + avatar for the "Continue as …" Google button
      if (u?.authProvider === "google") {
        try {
          localStorage.setItem("intake_last_google_email", u.email);
          if (u.avatarUrl) localStorage.setItem("intake_last_google_avatar", u.avatarUrl);
        } catch {}
      }
    } catch (error) {
      // If access token expired, try refreshing
      if (error instanceof ApiError && error.status === 401) {
        try {
          await api.refresh();
          const res = await api.me();
          const u = res.data?.user ?? null;
          setUser(u);
          if (u?.authProvider === "google") {
            try {
              localStorage.setItem("intake_last_google_email", u.email);
              if (u.avatarUrl) localStorage.setItem("intake_last_google_avatar", u.avatarUrl);
            } catch {}
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Resolving the session from the httpOnly cookie is the point of this
    // provider, and every state write happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      setUser(res.data?.user ?? null);
    },
    []
  );

  const signup = useCallback(async (input: RegistrationInput) => {
    const res = await api.register(input);
    setUser(res.data?.user ?? null);
    return { verificationCodeSent: res.data?.verificationCodeSent ?? false };
  }, []);

  const setSessionUser = useCallback((nextUser: User) => setUser(nextUser), []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser, setSessionUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
