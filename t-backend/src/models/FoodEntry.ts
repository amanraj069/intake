import mongoose, { Schema, Document } from 'mongoose';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_ENTRY_SOURCES = ['manual', 'ai-image'] as const;
export type FoodEntrySource = (typeof FOOD_ENTRY_SOURCES)[number];

export interface IFoodEntryDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  macros: {
    proteinG: number;
    carbG: number;
    fatG: number;
  };
  micros: Map<string, number>;
  date: Date;
  source: FoodEntrySource;
  createdAt: Date;
  updatedAt: Date;
}

const macrosSchema = new Schema(
  {
    proteinG: { type: Number, required: true, min: 0 },
    carbG: { type: Number, required: true, min: 0 },
    fatG: { type: Number, required: true, min: 0 },
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
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityUnit: {
      type: String,
      required: true,
      trim: true,
      default: 'g',
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    macros: {
      type: macrosSchema,
      required: true,
    },
    // A Map rather than fixed fields: which micronutrients are known varies per
    // food, and an AI-image source may return an arbitrary subset.
    micros: {
      type: Map,
      of: Number,
      default: () => new Map<string, number>(),
    },
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
  },
  {
    timestamps: true,
  }
);

// Supports "what did I eat on this day" lookups, the dominant read pattern.
foodEntrySchema.index({ userId: 1, date: -1 });

export const FoodEntry = mongoose.model<IFoodEntryDocument>('FoodEntry', foodEntrySchema);
