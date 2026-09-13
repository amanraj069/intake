import { FilterQuery } from 'mongoose';

import { FoodEntry, IFoodEntryDocument } from '../models/FoodEntry';
import {
  CreateFoodEntryInput,
  ListFoodEntriesQuery,
  UpdateFoodEntryInput,
} from '../schemas/foodEntry.schema';
import { AppError } from '../middleware/errorHandler';
import { CalendarDay, daysBefore, startOfDay, startOfNextDay, today } from '../lib/calendarDay';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';

/** How many days a list request covers when the caller gives no date bounds. */
const DEFAULT_RANGE_DAYS = 7;

type MicronutrientMap = Record<string, { amount: number; unit: string }>;

function toMicrosMap(micros: MicronutrientMap | Record<string, any> | undefined): Map<string, { amount: number; unit: string }> {
  const map = new Map<string, { amount: number; unit: string }>();
  if (!micros) return map;
  for (const [name, val] of Object.entries(micros)) {
    if (typeof val === 'number') {
      map.set(name, { amount: val, unit: 'mg' });
    } else if (val && typeof val === 'object') {
      map.set(name, { amount: Number(val.amount) || 0, unit: String(val.unit || 'mg') });
    }
  }
  return map;
}

/**
 * Loads an entry and asserts the caller owns it.
 * Missing entries are 404; someone else's entry is 403.
 */
async function findOwnedFoodEntry(
  userId: string,
  entryId: string
): Promise<IFoodEntryDocument> {
  const entry = await FoodEntry.findById(entryId);

  if (!entry) {
    throw new AppError('Food entry not found', 404);
  }

  if (entry.userId.toString() !== userId) {
    throw new AppError('You do not have access to this food entry', 403);
  }

  return entry;
}

export async function createFoodEntry(
  userId: string,
  input: CreateFoodEntryInput
): Promise<IFoodEntryDocument> {
  return FoodEntry.create({
    userId,
    mealType: input.mealType,
    foodName: input.foodName,
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    calories: input.calories,
    macros: input.macros,
    micros: toMicrosMap(input.micros),
    date: new Date(input.date),
    source: input.source ?? 'manual',
    confidenceScore: input.confidenceScore,
    confidenceLevel: input.confidenceLevel,
    extractionAnalysis: input.extractionAnalysis,
  });
}

function applyFoodEntryUpdate(entry: IFoodEntryDocument, input: UpdateFoodEntryInput): void {
  if (input.mealType !== undefined) entry.mealType = input.mealType;
  if (input.foodName !== undefined) entry.foodName = input.foodName;
  if (input.quantity !== undefined) entry.quantity = input.quantity;
  if (input.quantityUnit !== undefined) entry.quantityUnit = input.quantityUnit;
  if (input.calories !== undefined) entry.calories = input.calories;
  if (input.macros !== undefined) entry.macros = input.macros;
  // A supplied micros object replaces the whole map rather than merging, so a
  // nutrient removed in the UI actually disappears from the entry.
  if (input.micros !== undefined) entry.micros = toMicrosMap(input.micros);
  if (input.date !== undefined) entry.date = new Date(input.date);
  if (input.source !== undefined) entry.source = input.source;
  if (input.confidenceScore !== undefined) entry.confidenceScore = input.confidenceScore;
  if (input.confidenceLevel !== undefined) entry.confidenceLevel = input.confidenceLevel;
  if (input.extractionAnalysis !== undefined) entry.extractionAnalysis = input.extractionAnalysis;
}

export async function updateFoodEntry(
  userId: string,
  entryId: string,
  input: UpdateFoodEntryInput
): Promise<IFoodEntryDocument> {
  const entry = await findOwnedFoodEntry(userId, entryId);
  applyFoodEntryUpdate(entry, input);
  await entry.save();
  return entry;
}

export async function deleteFoodEntry(userId: string, entryId: string): Promise<void> {
  const entry = await findOwnedFoodEntry(userId, entryId);
  await entry.deleteOne();
}

/** Returns one of the user's entries, for pre-filling the edit form. */
export async function getFoodEntry(
  userId: string,
  entryId: string
): Promise<IFoodEntryDocument> {
  return findOwnedFoodEntry(userId, entryId);
}

/**
 * Resolves the day bounds a list request covers. Each bound falls back
 * independently: an absent end date means today, and an absent start date means
 * `DEFAULT_RANGE_DAYS` back from whichever end date applies.
 */
function resolveDateRange(query: ListFoodEntriesQuery): { start: CalendarDay; end: CalendarDay } {
  const end = query.endDate ?? today();
  const start = query.startDate ?? daysBefore(end, DEFAULT_RANGE_DAYS - 1);
  return { start, end };
}

function buildListFilter(
  userId: string,
  query: ListFoodEntriesQuery
): FilterQuery<IFoodEntryDocument> {
  const { start, end } = resolveDateRange(query);

  return {
    userId,
    date: { $gte: startOfDay(start), $lt: startOfNextDay(end) },
    ...(query.mealType ? { mealType: query.mealType } : {}),
  };
}

/**
 * One page of the user's entries, newest day first.
 *
 * Entries logged on the same day share an identical timestamp, so `createdAt`
 * and `_id` break the tie: without a total ordering the same record could
 * appear on two pages, or on none.
 */
export async function listFoodEntries(
  userId: string,
  query: ListFoodEntriesQuery
): Promise<PaginatedResult<IFoodEntryDocument>> {
  const filter = buildListFilter(userId, query);

  const [entries, total] = await Promise.all([
    FoodEntry.find(filter)
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .skip(toSkipCount(query))
      .limit(query.limit),
    FoodEntry.countDocuments(filter),
  ]);

  return buildPaginatedResult(entries, total, query);
}
