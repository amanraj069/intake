import { FilterQuery } from 'mongoose';

import { FoodEntry, IFoodEntryDocument } from '../models/FoodEntry';
import {
  CreateFoodEntryInput,
  FoodItemInput,
  ListFoodEntriesQuery,
  UpdateFoodEntryInput,
} from '../schemas/foodEntry.schema';
import { AppError } from '../middleware/errorHandler';
import { CalendarDay, daysBefore, startOfDay, startOfNextDay, today } from '../lib/calendarDay';
import { defaultEntryName } from '../lib/foodEntryName';
import { sumItemNutrition } from '../lib/foodItemTotals';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { deleteUploadedImage, extractPublicIdFromUrl } from '../lib/cloudinary';

/** How many days a list request covers when the caller gives no date bounds. */
const DEFAULT_RANGE_DAYS = 7;

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

/**
 * The stored items and the totals summed from them. Every write goes through
 * here, so an entry's totals always match its items.
 */
function buildItemFields(items: readonly FoodItemInput[]) {
  return {
    items: items.map((item) => ({ ...item, micros: item.micros ?? {} })),
    ...sumItemNutrition(items),
  };
}

/**
 * The stored fields for a validated create input. Shared by single create and
 * bulk import so both write exactly the same document shape.
 */
export function buildFoodEntryFields(userId: string, input: CreateFoodEntryInput) {
  return {
    userId,
    mealType: input.mealType,
    name: input.name ?? defaultEntryName(input.items),
    ...buildItemFields(input.items),
    date: new Date(input.date),
    source: input.source ?? 'manual',
    confidenceScore: input.confidenceScore,
    confidenceLevel: input.confidenceLevel,
    extractionAnalysis: input.extractionAnalysis,
    imageUrl: input.imageUrl,
    imagePublicId: input.imagePublicId,
  };
}

export async function createFoodEntry(
  userId: string,
  input: CreateFoodEntryInput
): Promise<IFoodEntryDocument> {
  return FoodEntry.create(buildFoodEntryFields(userId, input));
}

/**
 * A name the user typed is kept when the items change; a name that was only
 * ever the items joined follows the new items, so it never goes stale.
 */
function resolveUpdatedName(entry: IFoodEntryDocument, input: UpdateFoodEntryInput): string | undefined {
  if (input.name !== undefined) return input.name;
  if (input.items === undefined) return undefined;
  return entry.name === defaultEntryName(entry.items) ? defaultEntryName(input.items) : undefined;
}

function applyFoodEntryUpdate(entry: IFoodEntryDocument, input: UpdateFoodEntryInput): void {
  const name = resolveUpdatedName(entry, input);
  if (name !== undefined) entry.name = name;
  if (input.mealType !== undefined) entry.mealType = input.mealType;
  // Supplied items replace the whole list rather than merging, so an item
  // removed in the UI actually disappears, and the totals are summed afresh.
  if (input.items !== undefined) entry.set(buildItemFields(input.items));
  if (input.date !== undefined) entry.date = new Date(input.date);
  if (input.source !== undefined) entry.source = input.source;
  if (input.confidenceScore !== undefined) entry.confidenceScore = input.confidenceScore;
  if (input.confidenceLevel !== undefined) entry.confidenceLevel = input.confidenceLevel;
  if (input.extractionAnalysis !== undefined) entry.extractionAnalysis = input.extractionAnalysis;
  if (input.imageUrl !== undefined) entry.imageUrl = input.imageUrl;
  if (input.imagePublicId !== undefined) entry.imagePublicId = input.imagePublicId;
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
  const publicId = entry.imagePublicId || (entry.imageUrl ? extractPublicIdFromUrl(entry.imageUrl) : undefined);
  if (publicId) {
    await deleteUploadedImage(publicId).catch((error: unknown) => {
      console.error('[Cloudinary] Failed to delete meal image asset:', error);
    });
  }
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
