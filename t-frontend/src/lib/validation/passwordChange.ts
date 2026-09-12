export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Mirrors the backend's password rules so a mistyped confirmation is caught
 * before a code is mailed out, rather than after the user has entered one.
 */
export function passwordChangeError(newPassword: string, confirmation: string): string | null {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  if (newPassword !== confirmation) {
    return "Both passwords must match";
  }
  return null;
}
