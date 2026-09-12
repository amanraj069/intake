"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/profile");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Signed in. Taking you to your profile.");
      router.push("/profile");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Check for Google auth error in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("error");
    if (googleError === "google_auth_failed") {
      toast.error("Google authentication failed. Please try again.");
    }
    // Runs once on mount - the toast helper is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return null;

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-dark-text">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
            Sign in to your account to continue
          </p>
        </div>

        {/* Google OAuth */}
        <GoogleButton />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border dark:border-dark-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-bg-primary dark:bg-dark-bg px-4 text-xs uppercase tracking-widest text-text-secondary dark:text-dark-text-secondary">
              or
            </span>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs uppercase tracking-widest text-accent dark:text-accent-dark hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-accent dark:text-accent-dark font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
