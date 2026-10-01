"use client";

import type { ReactNode } from "react";
import { PeopleIcon } from "@/components/icons";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import SkeletonRows from "@/components/ui/SkeletonRows";
import type { PaginatedList } from "@/hooks/usePaginatedList";
import { SHARED_GRID_CLASSES } from "./SharedMealRow";

const PERSON_COLUMN = "person";
const COLUMN_HEADINGS = ["Date", "Meal", "Food", PERSON_COLUMN, "Serving", "Protein", "Carbs", "Fat", "Calories"];

interface SharedMealListProps<TShare> {
  list: PaginatedList<TShare>;
  /** Heading of the person column: "Shared by" or "Shared with". */
  personHeading: string;
  emptyMessage: string;
  emptyAction?: ReactNode;
  renderRow: (share: TShare) => ReactNode;
}

function TableHeader({ personHeading }: { personHeading: string }) {
  return (
    <div
      className={`${SHARED_GRID_CLASSES} px-5 sm:px-6 py-3.5 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-text-secondary dark:text-dark-text-secondary select-none`}
    >
      {COLUMN_HEADINGS.map((heading) => (
        <div key={heading} className={heading === "Calories" ? "text-right" : ""}>
          {heading === PERSON_COLUMN ? personHeading : heading}
        </div>
      ))}
      <div className="sr-only">Actions</div>
    </div>
  );
}

/** The shares table in either direction, laid out like the Meals table, with its loading, error and empty states. */
export default function SharedMealList<TShare>({
  list,
  personHeading,
  emptyMessage,
  emptyAction,
  renderRow,
}: SharedMealListProps<TShare>) {
  const { items, pageMeta, loading, loadError, setPage, reload } = list;

  if (loading) return <SkeletonRows count={6} />;
  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={
          <PeopleIcon className="w-16 h-16 sm:w-24 sm:h-24 text-text-secondary/40 dark:text-dark-text-secondary/40" />
        }
        description={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm">
        <div className="overflow-x-auto lg:overflow-visible">
          <div className="min-w-[900px] lg:min-w-0 pb-3 sm:pb-5 lg:pb-6">
            <TableHeader personHeading={personHeading} />
            <div>{items.map(renderRow)}</div>
          </div>
        </div>
      </div>
      <Pagination
        page={pageMeta.page}
        totalPages={pageMeta.totalPages}
        total={pageMeta.total}
        pageSize={items.length}
        onPageChange={setPage}
      />
    </div>
  );
}
