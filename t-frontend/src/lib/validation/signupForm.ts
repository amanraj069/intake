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

export interface SignupStep1Values {
  firstName: string;
  lastName: string;
  email: string;
}

export type SignupStep1Field = keyof SignupStep1Values;
export type SignupStep1Errors = Partial<Record<SignupStep1Field, string>>;

export interface SignupPasswordValues {
  password: string;
  confirmPassword: string;
}

export type SignupPasswordField = keyof SignupPasswordValues;
export type SignupPasswordErrors = Partial<Record<SignupPasswordField, string>>;

export const EMPTY_SIGNUP_DETAILS: SignupDetailsValues = {
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
};

export const EMPTY_SIGNUP_PASSWORDS: SignupPasswordValues = {
  password: "",
  confirmPassword: "",
};

export function nameError(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > MAX_NAME_LENGTH) return `${label} must be at most ${MAX_NAME_LENGTH} characters`;
  return undefined;
}

export function passwordError(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

export function validateSignupStep1(values: SignupStep1Values): SignupStep1Errors {
  const errors: SignupStep1Errors = {
    firstName: nameError(values.firstName, "First name"),
    lastName: nameError(values.lastName, "Last name"),
    email: !values.email.trim()
      ? "Email is required"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      ? "Please enter a valid email address"
      : undefined,
  };

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined)
  ) as SignupStep1Errors;
}

export function validateSignupPassword(values: SignupPasswordValues): SignupPasswordErrors {
  const errors: SignupPasswordErrors = {
    password: passwordError(values.password),
    confirmPassword:
      values.password === values.confirmPassword ? undefined : "Passwords do not match",
  };

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined)
  ) as SignupPasswordErrors;
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
