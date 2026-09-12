import { FoodEntry, IFoodEntryDocument } from '../models/FoodEntry';
import { CreateFoodEntryInput, UpdateFoodEntryInput } from '../schemas/foodEntry.schema';
import { AppError } from '../middleware/errorHandler';

type MicronutrientMap = Record<string, number>;

function toMicrosMap(micros: MicronutrientMap | undefined): Map<string, number> {
  return new Map(Object.entries(micros ?? {}));
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
