"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/ui/BackButton";
import AvatarPanel from "@/components/profile/AvatarPanel";

function ProfileContent() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();

  // Resend verification
  const [resending, setResending] = useState(false);

  // Email Change State
  const [emailState, setEmailState] = useState<'idle' | 'input' | 'otp'>('idle');
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Password Change State
  const [passwordState, setPasswordState] = useState<'idle' | 'otp'>('idle');
  const [passwordOtp, setPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function handleResendVerification() {
    setResending(true);
    try {
      const res = await api.resendVerification();
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send email");
    } finally {
      setResending(false);
    }
  }

  // --- Email OTP Flow ---
  async function handleRequestEmailOtp(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      await api.requestOtp('change-email', newEmail);
      setEmailState('otp');
      toast.success(`Verification code sent to ${newEmail}.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to request OTP";
      setEmailError(message);
      toast.error(message);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifyEmailOtp(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      await api.verifyOtp('change-email', emailOtp);
      setEmailState('idle');
      setNewEmail("");
      setEmailOtp("");
      await refreshUser();
      toast.success("Email updated successfully.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to verify OTP";
      setEmailError(message);
      toast.error(message);
    } finally {
      setEmailLoading(false);
    }
  }

  // --- Password OTP Flow ---
  async function handleRequestPasswordOtp() {
    setPasswordError("");
    setPasswordLoading(true);
    try {
      await api.requestOtp('change-password');
      setPasswordState('otp');
      toast.success("Verification code sent to your email.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to request OTP";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleVerifyPasswordOtp(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordLoading(true);
    try {
      await api.verifyOtp('change-password', passwordOtp, newPassword);
      setPasswordState('idle');
      setPasswordOtp("");
      setNewPassword("");
      toast.success("Password updated successfully.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update password";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) return null;

  const isGoogleUser = user.authProvider === "google";
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
          
          {/* Top navigation / header */}
          <div className="flex items-center gap-4">
            <BackButton size="md" className="-ml-2" />
            <h1 className="text-4xl font-extrabold tracking-tighter text-text-primary dark:text-dark-text uppercase">
              Profile
            </h1>
          </div>

          {/* Unverified banner */}
          {!user.emailVerified && (
            <div className="p-5 border border-black dark:border-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black/5 dark:bg-white/5">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-text-primary dark:text-dark-text">
                  Action Required
                </p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                  Your email is unverified. Check your inbox or request a new link.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResendVerification}
                loading={resending}
              >
                Resend Link
              </Button>
            </div>
          )}

          <AvatarPanel user={user} />

          {/* Account info */}
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary pb-4 border-b border-black/10 dark:border-white/10">
              Account Details
            </h2>

            <div className="grid gap-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary mb-2">
                    Email
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-medium text-text-primary dark:text-dark-text">
                      {user.email}
                    </p>
                    <Badge variant={user.emailVerified ? "success" : "warning"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
                
                {/* Email Change Logic */}
                {!isGoogleUser && (
                  <div className="md:text-right">
                    {emailState === 'idle' ? (
                      <Button variant="ghost" size="sm" onClick={() => setEmailState('input')}>
                        Update Email
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => { setEmailState('idle'); setEmailError(""); }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Email Change Forms */}
              {emailState === 'input' && (
                <form onSubmit={handleRequestEmailOtp} className="p-6 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                  <p className="text-sm font-medium">Enter your new email address. We will send a 6-digit code to verify it.</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="new@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" loading={emailLoading} className="px-8">
                      Send Code
                    </Button>
                  </div>
                  {emailError && <p className="text-sm text-error font-medium">{emailError}</p>}
                </form>
              )}

              {emailState === 'otp' && (
                <form onSubmit={handleVerifyEmailOtp} className="p-6 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                  <p className="text-sm font-medium">Enter the 6-digit code sent to <span className="font-bold">{newEmail}</span>.</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        className="tracking-[0.5em] font-mono text-center"
                      />
                    </div>
                    <Button type="submit" loading={emailLoading} className="px-8">
                      Verify
                    </Button>
                  </div>
                  {emailError && <p className="text-sm text-error font-medium">{emailError}</p>}
                </form>
              )}


              <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary mb-2">
                  Auth Provider
                </p>
                <p className="text-lg font-medium text-text-primary dark:text-dark-text capitalize">
                  {user.authProvider === "google" ? "Google" : "Email & Password"}
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary mb-2">
                  Member Since
                </p>
                <p className="text-lg font-medium text-text-primary dark:text-dark-text">
                  {memberSince}
                </p>
              </div>
            </div>
          </div>

          {/* Change password */}
          {!isGoogleUser && (
            <div className="space-y-6 pt-8">
              <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
                  Security
                </h2>
                {passwordState === 'idle' ? (
                  <Button variant="ghost" size="sm" onClick={handleRequestPasswordOtp} loading={passwordLoading}>
                    Change Password
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setPasswordState('idle'); setPasswordError(""); }}>
                    Cancel
                  </Button>
                )}
              </div>

              {passwordState === 'otp' && (
                <form onSubmit={handleVerifyPasswordOtp} className="p-6 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-6">
                  <p className="text-sm font-medium">A 6-digit code has been sent to your current email. Enter it below along with your new password.</p>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] mb-2">OTP Code</label>
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={passwordOtp}
                        onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        className="tracking-[0.5em] font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] mb-2">New Password</label>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" loading={passwordLoading} className="w-full">
                    Confirm & Update Password
                  </Button>
                  {passwordError && <p className="text-sm text-error font-medium">{passwordError}</p>}
                </form>
              )}

            </div>
          )}

          {/* Actions */}
          <div className="pt-12 border-t border-black/10 dark:border-white/10 flex justify-end">
            <Button variant="secondary" onClick={logout} className="uppercase tracking-widest text-xs font-bold px-8 py-4">
              Sign Out
            </Button>
          </div>
        </div>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
