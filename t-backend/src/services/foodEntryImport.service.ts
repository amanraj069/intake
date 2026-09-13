import { Types } from 'mongoose';

import { FoodEntry } from '../models/FoodEntry';
import { CreateFoodEntryInput, createFoodEntrySchema } from '../schemas/foodEntry.schema';
import { startOfDay, startOfNextDay } from '../lib/calendarDay';
import { defaultEntryName } from '../lib/foodEntryName';
import { sumItemNutrition } from '../lib/foodItemTotals';
import { roundToTenth } from '../lib/numbers';
import { AppError } from '../middleware/errorHandler';
import { buildFoodEntryFields } from './foodEntry.service';

export type ImportSkipReason = 'invalid' | 'duplicate';

export interface ImportSkip {
  /** 1-based position in the submitted list. */
  row: number;
  /** The entry's name, e.g. "Roti sabji", or its item names when it has none; null when neither could be read. */
  label: string | null;
  reason: ImportSkipReason;
  message: string;
}

export interface FoodEntryImportResult {
  importedCount: number;
  skipped: ImportSkip[];
}

interface ValidEntry {
  row: number;
  input: CreateFoodEntryInput;
}

/** The UTC day an entry counts towards, matching how summaries and reports group entries. */
function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Two entries are "the same meal" when the day, the set of item names and the
 * total calories all match. Names are compared case-insensitively and in any
 * order, since "Roti + Dal" and "dal + roti" with identical calories on one day
 * are plainly the same thing. Quantities are left out on purpose: the same
 * calories for the same foods is already the signal.
 */
function toDuplicateKey(date: Date, items: readonly { name: string }[], calories: number): string {
  const names = items.map((item) => item.name.trim().toLowerCase()).sort().join('+');
  return `${toDayKey(date)}|${names}|${roundToTenth(calories)}`;
}

function readEntryLabel(entry: unknown): string | null {
  const { name, items } = (entry ?? {}) as { name?: unknown; items?: unknown };
  if (typeof name === 'string' && name.trim()) return name.trim();
  if (!Array.isArray(items)) return null;

  const names = items
    .map((item) => (item as { name?: unknown } | null)?.name)
    .filter((name): name is string => typeof name === 'string' && Boolean(name.trim()));
  return names.length > 0 ? names.map((name) => name.trim()).join(' + ') : null;
}

function partitionByValidity(entries: readonly unknown[]): { valid: ValidEntry[]; invalid: ImportSkip[] } {
  const valid: ValidEntry[] = [];
  const invalid: ImportSkip[] = [];

  entries.forEach((entry, index) => {
    const parsed = createFoodEntrySchema.shape.body.safeParse(entry);
    if (parsed.success) {
      valid.push({ row: index + 1, input: parsed.data });
      return;
    }

    const message = [...new Set(parsed.error.issues.map((issue) => issue.message))].join('. ');
    invalid.push({ row: index + 1, label: readEntryLabel(entry), reason: 'invalid', message });
  });

  return { valid, invalid };
}

/** Keys of the user's already-saved entries on any day the import touches. */
async function loadExistingDuplicateKeys(userId: string, entries: readonly ValidEntry[]): Promise<Set<string>> {
  const days = entries.map(({ input }) => toDayKey(new Date(input.date))).sort();
  if (days.length === 0) return new Set();

  const existing = await FoodEntry.find(
    {
      userId: new Types.ObjectId(userId),
      date: { $gte: startOfDay(days[0]), $lt: startOfNextDay(days[days.length - 1]) },
    },
    { date: 1, 'items.name': 1, calories: 1 }
  ).lean();

  return new Set(existing.map((entry) => toDuplicateKey(entry.date, entry.items, entry.calories)));
}

function partitionByDuplication(
  entries: readonly ValidEntry[],
  existingKeys: ReadonlySet<string>
): { unique: ValidEntry[]; duplicates: ImportSkip[] } {
  const unique: ValidEntry[] = [];
  const duplicates: ImportSkip[] = [];
  const firstRowByKey = new Map<string, number>();

  for (const entry of entries) {
    const { input, row } = entry;
    const key = toDuplicateKey(new Date(input.date), input.items, sumItemNutrition(input.items).calories);
    const skip = { row, label: input.name ?? defaultEntryName(input.items), reason: 'duplicate' as const };

    if (existingKeys.has(key)) {
      duplicates.push({ ...skip, message: 'Already logged on this day with the same items and calories.' });
      continue;
    }

    const earlierRow = firstRowByKey.get(key);
    if (earlierRow !== undefined) {
      duplicates.push({ ...skip, message: `Same day, items and calories as row ${earlierRow} of this import.` });
      continue;
    }

    firstRowByKey.set(key, row);
    unique.push(entry);
  }

  return { unique, duplicates };
}

/** Imported rows are always tagged as such; client-sent AI metadata does not apply to them. */
function toImportedFields(userId: string, input: CreateFoodEntryInput) {
  return buildFoodEntryFields(userId, {
    ...input,
    source: 'pdf-import',
    confidenceScore: undefined,
    confidenceLevel: undefined,
    extractionAnalysis: undefined,
  });
}

async function insertEntries(userId: string, entries: readonly ValidEntry[]): Promise<void> {
  if (entries.length === 0) return;

  try {
    await FoodEntry.insertMany(entries.map(({ input }) => toImportedFields(userId, input)));
  } catch (cause) {
    console.error('[FoodEntryImport] Bulk insert failed:', cause);
    throw new AppError(
      'The import could not be saved. Check your meals list before trying again.',
      500,
      'IMPORT_SAVE_FAILED'
    );
  }
}

/**
 * Saves reviewed import rows for the user. Each row passes the same validation
 * as a single new entry; invalid rows and exact duplicates (of saved entries or
 * of earlier rows in the same import) are skipped and reported, never saved.
 */
export async function confirmFoodEntryImport(
  userId: string,
  entries: readonly unknown[]
): Promise<FoodEntryImportResult> {
  const { valid, invalid } = partitionByValidity(entries);
  const existingKeys = await loadExistingDuplicateKeys(userId, valid);
  const { unique, duplicates } = partitionByDuplication(valid, existingKeys);

  await insertEntries(userId, unique);

  return {
    importedCount: unique.length,
    skipped: [...invalid, ...duplicates].sort((a, b) => a.row - b.row),
  };
}
