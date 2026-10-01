import mongoose, { Schema, Document } from 'mongoose';

import { IFoodItem, foodItemSchema } from './FoodEntry';

/**
 * One food the user has logged, with the nutrition of the portion they last
 * logged. The unit is part of what the food is: "Roti" counted and "Roti"
 * weighed are separate items, so logging one never breaks a dish that links
 * the other.
 */
export interface IMealCatalogItemDocument extends Document, IFoodItem {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** The normalised name a message is matched against. */
  key: string;
  /** Other normalised names for the same food, such as its Hindi or English name, matched like `key`. */
  synonyms: string[];
  lastLoggedAt: Date;
}

const mealCatalogItemSchema = new Schema<IMealCatalogItemDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  synonyms: { type: [String], default: [] },
  lastLoggedAt: { type: Date, required: true },
});
// Same fields and limits as an item inside a logged meal.
mealCatalogItemSchema.add(foodItemSchema);

// Serves both the upsert on every save and the chat's lookup of unmatched foods by name.
mealCatalogItemSchema.index({ userId: 1, key: 1, unit: 1 }, { unique: true });

// Multikey, so a message naming a food by any of its synonyms is one index lookup.
mealCatalogItemSchema.index({ userId: 1, synonyms: 1 });

export const MealCatalogItem = mongoose.model<IMealCatalogItemDocument>(
  'MealCatalogItem',
  mealCatalogItemSchema
);
