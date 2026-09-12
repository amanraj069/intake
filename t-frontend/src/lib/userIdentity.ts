import type { User } from "./api";

/**
 * The display name shown next to the avatar. Accounts have no name field yet,
 * so the local part of the email stands in for one.
 */
export function displayName(user: Pick<User, "email">): string {
  return user.email.split("@")[0];
}

/**
 * Up to two initials for the avatar fallback. Common separators in the email's
 * local part ("ada.lovelace", "ada_lovelace") read as a first and second name,
 * which gives "AL" rather than the far less personal "AD".
 */
export function initials(user: Pick<User, "email">): string {
  const words = displayName(user)
    .split(/[.\-_+\s]+/)
    .filter(Boolean);

  if (words.length === 0) return "?";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}
