import bcrypt from 'bcryptjs';

/**
 * Cost factor for every password and OTP hash in the app. Kept in one place so
 * a future bump can't leave some credentials hashed weaker than others.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export { SALT_ROUNDS };
