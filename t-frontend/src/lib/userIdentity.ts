import type { User } from "./api";

type NamedUser = Pick<User, "email" | "firstName" | "lastName">;

function nameParts(user: NamedUser): string[] {
  return [user.firstName, user.lastName].filter((part): part is string => Boolean(part?.trim()));
}

/**
 * The name shown next to the avatar. Accounts created before names were
 * collected have none, so the local part of the email stands in for one.
 */
export function displayName(user: NamedUser): string {
  const parts = nameParts(user);
  return parts.length > 0 ? parts.join(" ") : user.email.split("@")[0];
}

/** The friendliest short form, for greetings: a first name when there is one. */
export function firstNameOrFallback(user: NamedUser): string {
  return user.firstName?.trim() || displayName(user);
}

/**
 * Up to two initials for the avatar fallback. Without a stored name, common
 * separators in the email's local part ("ada.lovelace", "ada_lovelace") read as
 * a first and second name, which gives "AL" rather than the far less personal "AD".
 */
export function initials(user: NamedUser): string {
  const parts = nameParts(user);
  const words = parts.length > 0 ? parts : displayName(user).split(/[.\-_+\s]+/).filter(Boolean);

  if (words.length === 0) return "?";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}
