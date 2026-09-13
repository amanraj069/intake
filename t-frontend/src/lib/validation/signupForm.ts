/** Mirrors `registerSchema` in t-backend/src/schemas/auth.schema.ts. Keep the two in sync. */
const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface SignupDetailsValues {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export type SignupDetailsField = keyof SignupDetailsValues;
export type SignupDetailsErrors = Partial<Record<SignupDetailsField, string>>;

export const EMPTY_SIGNUP_DETAILS: SignupDetailsValues = {
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
};

function nameError(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > MAX_NAME_LENGTH) return `${label} must be at most ${MAX_NAME_LENGTH} characters`;
  return undefined;
}

function passwordError(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

export function validateSignupDetails(values: SignupDetailsValues): SignupDetailsErrors {
  const errors: SignupDetailsErrors = {
    firstName: nameError(values.firstName, "First name"),
    lastName: nameError(values.lastName, "Last name"),
    password: passwordError(values.password),
    confirmPassword:
      values.password === values.confirmPassword ? undefined : "Passwords do not match",
  };

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined)
  ) as SignupDetailsErrors;
}
