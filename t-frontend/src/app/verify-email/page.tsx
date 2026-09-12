"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Spinner from "@/components/ui/Spinner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  // The token lives in the URL, so verification can only start after mount.
  useEffect(() => {
    if (!token) {
      // Renders the same error panel a failed request would, one render later.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    async function verify() {
      try {
        const res = await api.verifyEmail(token);
        setStatus("success");
        setMessage(res.message);
      } catch {
        setStatus("error");
        setMessage("Invalid or expired verification token");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="text-center space-y-6">
      {status === "loading" && (
        <>
          <Spinner
            size="lg"
            className="mx-auto text-accent dark:text-accent-dark"
          />
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            Verifying your email...
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-success/10 dark:bg-success-dark/10">
            <svg
              className="w-8 h-8 text-success dark:text-success-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text">
              Email verified
            </h1>
            <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
              {message}
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-block text-sm font-semibold uppercase tracking-widest text-accent dark:text-accent-dark hover:underline"
          >
            Go to profile →
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-error/10 dark:bg-error-dark/10">
            <svg
              className="w-8 h-8 text-error dark:text-error-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
              {message}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold uppercase tracking-widest text-accent dark:text-accent-dark hover:underline"
          >
            Go to sign in →
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-6 pt-14 bg-bg-primary dark:bg-dark-bg">
        <div className="w-full max-w-[420px]">
          <Suspense>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </>
  );
}
