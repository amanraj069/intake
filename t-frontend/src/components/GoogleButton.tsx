"use client";

import { useState, useEffect } from "react";
import { api, API_URL } from "@/lib/api";
import { GoogleIcon } from "@/components/icons";

interface GoogleButtonProps {
  /** When provided, renders "Continue as <email>" with the Google icon on the right (Unstop-style). */
  email?: string | null;
  avatarUrl?: string | null;
}

export default function GoogleButton({ email: emailProp, avatarUrl: avatarProp }: GoogleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [storedAvatar, setStoredAvatar] = useState<string | null>(null);

  // On mount, try to read last-used Google account info from localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("intake_last_google_email");
      const savedAvatar = localStorage.getItem("intake_last_google_avatar");
      if (savedEmail) setStoredEmail(savedEmail);
      if (savedAvatar) setStoredAvatar(savedAvatar);
    } catch {
      // localStorage unavailable (e.g. private browsing) — no-op
    }
  }, []);

  const email = emailProp ?? storedEmail;
  const avatarUrl = avatarProp ?? storedAvatar;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Health check to ensure backend is reachable before redirecting
      // If the backend is down, this will throw a network error and be caught
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) {
        throw new Error("Backend responded with an error");
      }
      
      // If healthy, redirect to Google Auth
      window.location.href = api.googleAuthUrl();
    } catch {
      setError("Service unavailable. Please try again.");
      setLoading(false);
    }
  };

  const label = loading
    ? "Connecting..."
    : email
      ? `Continue as ${email}`
      : "Continue with Google";

  return (
    <div className="w-full flex flex-col gap-2">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="
          w-full inline-flex items-center justify-between gap-2.5 sm:gap-3
          px-4 py-2.5 sm:px-5 sm:py-3
          rounded-xl
          border border-black/10
          bg-white
          text-xs sm:text-sm font-semibold  
          text-text-primary
          hover:bg-gray-50
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {email ? (
          <>
            {/* Profile picture + label on the left, Google icon on the right */}
            <span className="inline-flex items-center gap-2.5 sm:gap-3 min-w-0">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="truncate">{label}</span>
            </span>
            <GoogleIcon />
          </>
        ) : (
          <>
            <GoogleIcon />
            <span className="flex-1 text-center">{label}</span>
            {/* Invisible spacer to keep text centered */}
            <span className="w-[18px] shrink-0" aria-hidden="true" />
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-xs text-center">
          {error}
        </p>
      )}
    </div>
  );
}
