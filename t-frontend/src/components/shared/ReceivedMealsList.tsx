"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUnseenShares } from "@/contexts/UnseenSharesContext";
import { useSharedMeals } from "@/hooks/useSharedMeals";
import SharedMealList from "./SharedMealList";
import SharedMealRow from "./SharedMealRow";
import SharedPeopleCell from "./SharedPeopleCell";

/**
 * Meals other people have shared with the current user. Rows open a read-only
 * detail page. Showing a page marks its new shares as seen, which clears the
 * sidebar dot at once, while the rows keep their dots until the next visit so
 * the user can still tell what is new.
 */
export default function ReceivedMealsList() {
  const router = useRouter();
  const sharedMeals = useSharedMeals();
  const { markSeen } = useUnseenShares();

  useEffect(() => {
    const unseenIds = sharedMeals.items.filter((share) => !share.seen).map((share) => share.id);
    if (unseenIds.length > 0) void markSeen(unseenIds);
  }, [sharedMeals.items, markSeen]);

  return (
    <SharedMealList
      list={sharedMeals}
      personHeading="Shared by"
      emptyMessage="No one has shared a meal with you yet. When someone does, it shows up here."
      renderRow={(share) => (
        <SharedMealRow
          key={share.id}
          meal={share.meal}
          person={<SharedPeopleCell people={[share.sharedBy]} isNew={!share.seen} />}
          onClick={() => router.push(`/shared/${share.id}`)}
        />
      )}
    />
  );
}
