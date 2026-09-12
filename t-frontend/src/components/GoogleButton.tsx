"use client";

import { useState } from "react";
import { api, API_URL } from "@/lib/api";

export default function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="w-full flex flex-col gap-2">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="
          w-full inline-flex items-center justify-center gap-3
          px-6 py-3
          border border-border
          text-sm font-semibold uppercase tracking-wide
          text-text-primary
          hover:bg-bg-surface
          transition-colors duration-150
          dark:border-dark-border
          dark:text-dark-text
          dark:hover:bg-dark-surface
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {/* Google "G" icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Connecting..." : "Continue with Google"}
      </button>
      
      {error && (
        <p className="text-red-500 text-xs text-center">
          {error}
        </p>
      )}
    </div>
  );
}
