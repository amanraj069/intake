"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditIcon, PeopleIcon } from "@/components/icons";
import Button from "@/components/ui/Button";
import RowActionsMenu, { MENU_ITEM_CLASSES } from "@/components/ui/RowActionsMenu";
import { useSentMeals } from "@/hooks/useSharedMeals";
import type { SentMeal } from "@/types/sharedMeal";
import ManageAccessDialog from "./ManageAccessDialog";
import SharedMealList from "./SharedMealList";
import SharedMealRow from "./SharedMealRow";
import SharedPeopleCell from "./SharedPeopleCell";

interface SentMealActionsProps {
  onManageAccess: () => void;
  onEdit: () => void;
}

function SentMealActions({ onManageAccess, onEdit }: SentMealActionsProps) {
  return (
    <RowActionsMenu>
      {(closeMenu) => (
        <>
          <button
            type="button"
            role="menuitem"
            className={`${MENU_ITEM_CLASSES} whitespace-nowrap`}
            onClick={() => {
              closeMenu();
              onManageAccess();
            }}
          >
            <PeopleIcon className="h-3.5 w-3.5" />
            <span>Manage access</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${MENU_ITEM_CLASSES} whitespace-nowrap`}
            onClick={() => {
              closeMenu();
              onEdit();
            }}
          >
            <EditIcon className="h-3.5 w-3.5" />
            <span>Edit meal</span>
          </button>
        </>
      )}
    </RowActionsMenu>
  );
}

/** The current user's shared meals, one row per meal, each with a menu to manage who can see it. */
export default function SentMealsList() {
  const router = useRouter();
  const sentMeals = useSentMeals();
  const [mealToManage, setMealToManage] = useState<SentMeal | null>(null);

  // Stable, so the dialog's Escape listener is not re-bound on every render.
  const closeManageDialog = useCallback(() => setMealToManage(null), []);
  const editMeal = (sentMeal: SentMeal) => router.push(`/meals/${sentMeal.meal._id}/edit`);

  return (
    <>
      <SharedMealList
        list={sentMeals}
        personHeading="Shared with"
        emptyMessage="You have not shared any meals yet. Open the actions menu on any meal and choose Share."
        emptyAction={
          <Link href="/meals">
            <Button size="sm" className="sm:px-6 sm:py-3 sm:text-sm">
              Go to Meals
            </Button>
          </Link>
        }
        renderRow={(sentMeal) => (
          <SharedMealRow
            key={sentMeal.id}
            meal={sentMeal.meal}
            person={<SharedPeopleCell people={sentMeal.sharedWith} />}
            actions={
              <SentMealActions onManageAccess={() => setMealToManage(sentMeal)} onEdit={() => editMeal(sentMeal)} />
            }
            onClick={() => editMeal(sentMeal)}
          />
        )}
      />
      <ManageAccessDialog sentMeal={mealToManage} onClose={closeManageDialog} onUpdated={sentMeals.reload} />
    </>
  );
}
