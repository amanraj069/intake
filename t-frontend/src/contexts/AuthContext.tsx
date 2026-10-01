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
import { toErrorMessage } from "@/lib/errorMessage";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /**
   * Set when the server could not confirm the session (offline, restarting,
   * 5xx). That says nothing about whether the user is signed in, so they are
   * shown a retry instead of being sent to the login page.
   */
  sessionError: string | null;
  /** Tries to confirm the session again after `sessionError`. */
  retrySession: () => Promise<void>;
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
  sessionError: null,
  retrySession: async () => {},
  login: async () => {},
  signup: async () => ({ verificationCodeSent: false }),
  logout: async () => {},
  refreshUser: async () => {},
  setSessionUser: () => {},
});

/** Remembers the email and avatar for the "Continue as ..." Google button. */
function rememberGoogleAccount(user: User | null): void {
  if (user?.authProvider !== "google") return;
  try {
    localStorage.setItem("intake_last_google_email", user.email);
    if (user.avatarUrl) localStorage.setItem("intake_last_google_avatar", user.avatarUrl);
  } catch {
    // Storage can be unavailable (private mode, quota); the button then just shows the generic label.
  }
}

/** The API client has already tried a token refresh, so a 401 here means the session is over. */
function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      const nextUser = res.data?.user ?? null;
      setUser(nextUser);
      setSessionError(null);
      rememberGoogleAccount(nextUser);
    } catch (error) {
      if (isSignedOut(error)) {
        setUser(null);
        setSessionError(null);
        return;
      }
      // Any user already loaded is kept: a failed check is not a sign-out.
      setSessionError(toErrorMessage(error, "We could not reach the server to confirm your session."));
    } finally {
      setLoading(false);
    }
  }, []);

  const retrySession = useCallback(async () => {
    setLoading(true);
    await refreshUser();
  }, [refreshUser]);

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
      value={{
        user,
        loading,
        sessionError,
        retrySession,
        login,
        signup,
        logout,
        refreshUser,
        setSessionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
