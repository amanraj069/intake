import { IUser } from '../types';

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Where a browser lands after a redirect-based sign-in (Google OAuth). A user
 * who has not set up their body profile yet goes through onboarding first, so
 * their goals are filled in before they ever see an empty dashboard.
 */
export function postAuthRedirectUrl(user: Pick<IUser, 'onboardingCompletedAt'>): string {
  const path = user.onboardingCompletedAt ? '/dashboard' : '/onboarding';
  return `${getFrontendUrl()}${path}`;
}
