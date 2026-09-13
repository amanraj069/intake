import mongoose, { Schema, Document } from 'mongoose';

export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_ENTRY_SOURCES = ['manual', 'ai-image', 'pdf-import'] as const;
export type FoodEntrySource = (typeof FOOD_ENTRY_SOURCES)[number];

/**
 * How an item is measured. Weighed food is grams, liquids are millilitres, and
 * discrete pieces (rotis, eggs, slices) are a count, with the item's name
 * saying what is counted.
 */
export const FOOD_ITEM_UNITS = ['g', 'ml', 'count'] as const;
export type FoodItemUnit = (typeof FOOD_ITEM_UNITS)[number];

export interface StoredMicronutrient {
  amount: number;
  unit: string;
}

export interface StoredMacros {
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** One component of a logged meal, with the nutrition of exactly that quantity. */
export interface IFoodItem {
  name: string;
  quantity: number;
  unit: FoodItemUnit;
  calories: number;
  macros: StoredMacros;
  micros: Map<string, StoredMicronutrient>;
}

export interface IFoodEntryDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  mealType: MealType;
  /** What the whole meal is called, e.g. "Roti sabji". Defaults to the item names joined. */
  name: string;
  items: IFoodItem[];
  /** Sum of every item's calories. */
  calories: number;
  /** Sum of every item's macros. */
  macros: StoredMacros;
  /** Every item's micronutrients, summed per nutrient. */
  micros: Map<string, StoredMicronutrient>;
  date: Date;
  source: FoodEntrySource;
  confidenceScore?: number;
  confidenceLevel?: string;
  extractionAnalysis?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const macrosSchema = new Schema<StoredMacros>(
  {
    proteinG: { type: Number, required: true, min: 0 },
    carbG: { type: Number, required: true, min: 0 },
    fatG: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const microsSchema = new Schema<StoredMicronutrient>(
  {
    amount: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// A Map rather than fixed fields: which micronutrients are known varies per
// food, and an AI source may return an arbitrary subset.
const microsMapField = {
  type: Map,
  of: microsSchema,
  default: () => new Map<string, StoredMicronutrient>(),
};

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: FOOD_ITEM_UNITS, required: true },
    calories: { type: Number, required: true, min: 0 },
    macros: { type: macrosSchema, required: true },
    micros: microsMapField,
  },
  { _id: false }
);

const foodEntrySchema = new Schema<IFoodEntryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      enum: MEAL_TYPES,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [foodItemSchema],
      required: true,
      validate: {
        validator: (items: IFoodItem[]) => items.length > 0,
        message: 'An entry needs at least one item',
      },
    },
    // The totals are stored, not computed on read, so the dashboard, summaries
    // and reports can keep aggregating single numbers per entry. The service
    // always rewrites them from the items; they are never taken from a client.
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    macros: {
      type: macrosSchema,
      required: true,
    },
    micros: microsMapField,
    // The day the food was eaten, kept separate from createdAt so entries can
    // be backdated without distorting when the record was written.
    date: {
      type: Date,
      required: true,
    },
    source: {
      type: String,
      enum: FOOD_ENTRY_SOURCES,
      required: true,
      default: 'manual',
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    confidenceLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    extractionAnalysis: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Supports "what did I eat on this day" lookups, the dominant read pattern.
foodEntrySchema.index({ userId: 1, date: -1 });

export const FoodEntry = mongoose.model<IFoodEntryDocument>('FoodEntry', foodEntrySchema);
