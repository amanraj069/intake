const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A field-level message for an email input, or undefined when it looks deliverable. */
export function emailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_PATTERN.test(trimmed)) return "Please enter a valid email address";
  return undefined;
}
