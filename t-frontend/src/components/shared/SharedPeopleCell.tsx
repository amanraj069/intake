"use client";

import NotificationDot from "@/components/ui/NotificationDot";
import { displayName } from "@/lib/userIdentity";
import type { SharedUser } from "@/types/sharedMeal";

interface SharedPeopleCellProps {
  people: SharedUser[];
  /** Marks a share the user had not seen before this visit, with a dot at the top right of the name. */
  isNew?: boolean;
}

/** Who is on the other end of a share: one person's name and email, or the first name and a count. */
export default function SharedPeopleCell({ people, isNew = false }: SharedPeopleCellProps) {
  const [first, ...others] = people;
  if (!first) return null;

  const secondLine = others.length === 0 ? first.email : `and ${others.length} more`;

  return (
    <div title={people.map((person) => person.email).join(", ")}>
      <p className="flex min-w-0 items-start gap-1 text-xs font-semibold text-text-primary dark:text-dark-text">
        <span className="truncate">{displayName(first)}</span>
        {isNew && <NotificationDot label="New" size="sm" className="mt-0.5" />}
      </p>
      <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary truncate">{secondLine}</p>
    </div>
  );
}
