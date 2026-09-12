"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setStep(2);
      toast.success(res.message);
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

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.resetPassword(email, otp, newPassword);
      toast.success(res.message);
      router.push("/login");
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

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-dark-text">
            {step === 1 ? "Reset password" : "Enter verification code"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
            {step === 1
              ? "Enter your email and we'll send you a 6-digit verification code"
              : `Enter the code sent to ${email} along with your new password`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Button type="submit" loading={loading} className="w-full">
              Send Code
            </Button>

            <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary">
              Remember your password?{" "}
              <Link
                href="/login"
                className="text-accent dark:text-accent-dark font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <Input
              label="Verification Code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className=" font-mono text-center"
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Update Password
            </Button>

            <div className="flex justify-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-text-secondary dark:text-dark-text-secondary hover:underline"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
