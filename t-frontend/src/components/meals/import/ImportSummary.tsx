"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataPair from "@/components/ui/DataPair";
import type { FoodEntryImportResult, ImportSkip } from "@/types/foodImport";

const SKIP_REASON_LABELS: Record<ImportSkip["reason"], string> = {
  duplicate: "Duplicate",
  invalid: "Invalid",
};

interface ImportSummaryProps {
  result: FoodEntryImportResult;
  /** The PDF row number of each submitted entry, so skips are named as the review table named them. */
  rowNumbers: readonly number[];
  onImportAnother: () => void;
}

function pluralEntries(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

/** The plain outcome of an import: what was saved, and each row that was not, with the reason. */
export default function ImportSummary({ result, rowNumbers, onImportAnother }: ImportSummaryProps) {
  const { importedCount, skipped } = result;

  return (
    <Card className="space-y-8 sm:p-8">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary dark:text-dark-text">Import finished</h2>
        <p className="mt-2 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
          Imported {pluralEntries(importedCount)}.
          {skipped.length > 0 ? ` Skipped ${pluralEntries(skipped.length)}, listed below.` : " Nothing was skipped."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 sm:max-w-sm">
        <DataPair label="Imported" value={String(importedCount)} />
        <DataPair label="Skipped" value={String(skipped.length)} />
      </div>

      {skipped.length > 0 && (
        <ul className="divide-y divide-black/5 dark:divide-white/10 border-t border-black/5 dark:border-white/10">
          {skipped.map((skip) => (
            <li key={skip.row} className="py-3 text-sm">
              <p className="font-semibold text-text-primary dark:text-dark-text">
                Row {rowNumbers[skip.row - 1] ?? skip.row}
                {skip.label ? `: ${skip.label}` : ""}
                <span className="ml-2 font-light text-text-secondary dark:text-dark-text-secondary">
                  {SKIP_REASON_LABELS[skip.reason]}
                </span>
              </p>
              <p className="mt-0.5 font-light text-text-secondary dark:text-dark-text-secondary">{skip.message}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/meals" className="sm:w-auto">
          <Button className="w-full">View meals</Button>
        </Link>
        <Button variant="secondary" onClick={onImportAnother}>
          Import another PDF
        </Button>
      </div>
    </Card>
  );
}
