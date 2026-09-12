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

export default function SignupPage() {
  const { signup, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/profile");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setFieldErrors({
        password: "Password must be at least 8 characters",
      });
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      toast.success("Account created. Check your inbox to verify your email.");
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        if (err.errors) {
          const mapped: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(err.errors)) {
            mapped[key] = msgs[0];
          }
          setFieldErrors(mapped);
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-dark-text">
            Create account
          </h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
            Get started with your free account
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

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <Button type="submit" loading={loading} className="w-full">
            Create Account
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent dark:text-accent-dark font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
