import mongoose, { Schema, Document } from 'mongoose';

/** One food in a dish: a link to the catalogue item and how much of it the dish holds. */
export interface MealCatalogDishComponent {
  item: mongoose.Types.ObjectId;
  /** In the linked item's unit. */
  quantity: number;
}

/**
 * A logged meal of several foods ("Roti sabji"), kept as links to its
 * catalogue items rather than copies of them. Its nutrition is always derived
 * from the items, so correcting a food corrects every dish that contains it.
 */
export interface IMealCatalogDishDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** The normalised name a message is matched against. */
  key: string;
  /** Other normalised names for the same food, such as its Hindi or English name, matched like `key`. */
  synonyms: string[];
  /** The name as the user last logged it. */
  name: string;
  components: MealCatalogDishComponent[];
  lastLoggedAt: Date;
}

const dishComponentSchema = new Schema<MealCatalogDishComponent>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'MealCatalogItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const mealCatalogDishSchema = new Schema<IMealCatalogDishDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  synonyms: { type: [String], default: [] },
  name: { type: String, required: true, trim: true },
  components: { type: [dishComponentSchema], required: true },
  lastLoggedAt: { type: Date, required: true },
});

// Logging a dish of the same name again replaces its components.
mealCatalogDishSchema.index({ userId: 1, key: 1 }, { unique: true });

// Multikey, so a message naming a food by any of its synonyms is one index lookup.
mealCatalogDishSchema.index({ userId: 1, synonyms: 1 });

export const MealCatalogDish = mongoose.model<IMealCatalogDishDocument>(
  'MealCatalogDish',
  mealCatalogDishSchema
);
