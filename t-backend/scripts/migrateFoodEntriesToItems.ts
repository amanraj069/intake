import 'dotenv/config';

import mongoose from 'mongoose';

import { defaultEntryName } from '../src/lib/foodEntryName';
import { LegacyFoodEntryFields, toItemFromLegacyEntry } from '../src/lib/legacyFoodEntry';

/**
 * One-time migration to entries with a name and items.
 *
 *   npm run migrate:food-items             # show what would change, write nothing
 *   npm run migrate:food-items -- --apply  # back up, then migrate
 *
 * A single-food entry becomes one item carrying its food, amount and nutrition,
 * named after that food. Its calories, macros and micros already equal the
 * item's values, so they stay as they are. An entry that already has items but
 * no name is named after its items ("Roti + Dal"). Before anything is written,
 * every affected document is copied to a timestamped backup collection. Running
 * it again is safe: only documents still missing a part are touched.
 */

const COLLECTION = 'foodentries';
const LEGACY_FILTER = { foodName: { $exists: true }, items: { $exists: false } };
const UNNAMED_FILTER = { items: { $exists: true }, name: { $exists: false } };

type LegacyDocument = Partial<LegacyFoodEntryFields> & {
  _id: mongoose.Types.ObjectId;
  items?: { name: string }[];
};

/** The fields to set and remove for one document, whichever old shape it is in. */
function planChange(document: LegacyDocument) {
  if (document.items) {
    return { $set: { name: defaultEntryName(document.items) } };
  }

  const legacy = document as LegacyFoodEntryFields & LegacyDocument;
  return {
    $set: { name: legacy.foodName, items: [toItemFromLegacyEntry(legacy)] },
    $unset: { foodName: '', quantity: '', quantityUnit: '' },
  };
}

function describe(document: LegacyDocument): string {
  if (document.items) return `${document._id}: named "${defaultEntryName(document.items)}" after its items`;

  const item = toItemFromLegacyEntry(document as LegacyFoodEntryFields);
  return `${document._id}: "${document.foodName}" ${document.quantity} x "${document.quantityUnit ?? ''}" -> named "${document.foodName}", item "${item.name}" ${item.quantity} ${item.unit}`;
}

async function backUp(documents: readonly LegacyDocument[]): Promise<string> {
  const backupName = `${COLLECTION}_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mongoose.connection.db!.collection(backupName).insertMany(documents.map((document) => ({ ...document })));
  return backupName;
}

async function migrate(documents: readonly LegacyDocument[]): Promise<number> {
  const result = await mongoose.connection.db!.collection(COLLECTION).bulkWrite(
    documents.map((document) => ({
      updateOne: {
        filter: { _id: document._id, ...(document.items ? UNNAMED_FILTER : LEGACY_FILTER) },
        update: planChange(document),
      },
    }))
  );
  return result.modifiedCount;
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/t-starter');

  try {
    const documents = await mongoose.connection
      .db!.collection<LegacyDocument>(COLLECTION)
      .find({ $or: [LEGACY_FILTER, UNNAMED_FILTER] })
      .toArray();

    console.log(`${documents.length} entries to migrate.`);
    documents.forEach((document) => console.log(`  ${describe(document)}`));
    if (documents.length === 0 || !apply) {
      if (documents.length > 0) console.log('Dry run: nothing written. Re-run with --apply to migrate.');
      return;
    }

    const backupName = await backUp(documents);
    console.log(`Backed up ${documents.length} documents to "${backupName}".`);
    console.log(`Migrated ${await migrate(documents)} entries.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
