import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { FoodEntry } from '../src/models/FoodEntry';

/**
 * The confirm half of PDF import, end to end over HTTP. Preview needs a live AI
 * provider, so only its input checks (which fail before any AI call) run here.
 */

const IMPORT_PATH = '/api/food-entries/import/confirm';
const PREVIEW_PATH = '/api/food-entries/import/preview';

interface ItemOverrides {
  name?: string;
  calories?: number;
}

function item({ name = 'Rolled oats', calories = 310 }: ItemOverrides = {}) {
  return { name, quantity: 250, unit: 'g', calories, macros: { proteinG: 13, carbG: 48, fatG: 7 } };
}

function importRow(overrides: Record<string, unknown> = {}) {
  return { mealType: 'breakfast', date: '2026-09-07', items: [item()], ...overrides };
}

function pdfForm(bytes: Uint8Array | string, type: string, name = 'diary.pdf'): FormData {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  return form;
}

let server: TestServer;
let owner: TestUser;
let otherUser: TestUser;

before(async () => {
  server = await startTestServer();
  owner = await createTestUser('import-owner');
  otherUser = await createTestUser('import-other');
});

beforeEach(async () => {
  await FoodEntry.deleteMany({});
});

after(async () => {
  await server.close();
});

describe('confirm import', () => {
  test('saves valid rows for the session user, tagged as a PDF import', async () => {
    const result = await server.request(owner, 'POST', IMPORT_PATH, {
      entries: [
        importRow({ userId: otherUser.id, source: 'manual', confidenceScore: 90 }),
        importRow({ items: [item({ name: 'Banana', calories: 105 })], mealType: 'snack' }),
      ],
    });

    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, { importedCount: 2, skipped: [] });

    const saved = await FoodEntry.find({}).lean();
    assert.equal(saved.length, 2);
    for (const entry of saved) {
      assert.equal(entry.userId.toString(), owner.id);
      assert.equal(entry.source, 'pdf-import');
      assert.equal(entry.confidenceScore, undefined);
    }
  });

  test('skips invalid rows with the single-entry validation message, and saves the rest', async () => {
    const result = await server.request(owner, 'POST', IMPORT_PATH, {
      entries: [
        importRow(),
        importRow({ name: 'Broken lunch', items: [item({ name: 'Broken', calories: -5 })] }),
        { items: [{ name: 'Only a name' }] },
      ],
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.data.importedCount, 1);
    const [negative, incomplete] = result.body.data.skipped;
    assert.deepEqual(
      { row: negative.row, reason: negative.reason, label: negative.label },
      { row: 2, reason: 'invalid', label: 'Broken lunch' }
    );
    assert.match(negative.message, /Calories cannot be negative/);
    assert.equal(incomplete.row, 3);
    assert.equal(incomplete.reason, 'invalid');
    assert.equal(await FoodEntry.countDocuments(), 1);
  });

  test('skips exact duplicates of saved entries and of earlier rows, leaving saved data untouched', async () => {
    const rotiAndDal = [item({ name: 'Roti', calories: 240 }), item({ name: 'Dal', calories: 180 })];
    await server.request(owner, 'POST', '/api/food-entries', importRow({ items: rotiAndDal }));
    const before = await FoodEntry.find({}).lean();

    const reordered = [item({ name: 'dal', calories: 180 }), item({ name: 'ROTI', calories: 240 })];
    const result = await server.request(owner, 'POST', IMPORT_PATH, {
      entries: [
        importRow({ items: reordered, mealType: 'lunch' }),
        importRow(),
        importRow({ items: [{ ...item(), quantity: 300 }] }),
        importRow({ date: '2026-09-08' }),
        importRow({ items: [item({ calories: 311 })] }),
      ],
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.data.importedCount, 3);
    assert.deepEqual(
      result.body.data.skipped.map((skip: { row: number; reason: string }) => [skip.row, skip.reason]),
      [
        [1, 'duplicate'],
        [3, 'duplicate'],
      ]
    );
    assert.match(result.body.data.skipped[1].message, /row 2 of this import/);

    const original = await FoodEntry.findById(before[0]._id).lean();
    assert.deepEqual(original, before[0]);
    assert.equal(await FoodEntry.countDocuments(), 4);
  });

  test("another user's identical entry is not treated as a duplicate", async () => {
    await server.request(otherUser, 'POST', '/api/food-entries', importRow());

    const result = await server.request(owner, 'POST', IMPORT_PATH, { entries: [importRow()] });

    assert.equal(result.body.data.importedCount, 1);
    assert.equal(await FoodEntry.countDocuments({ userId: otherUser.id }), 1);
  });

  test('rejects an empty or oversized batch before saving anything', async () => {
    const empty = await server.request(owner, 'POST', IMPORT_PATH, { entries: [] });
    const oversized = await server.request(owner, 'POST', IMPORT_PATH, {
      entries: Array.from({ length: 101 }, (_, index) => importRow({ items: [item({ calories: index })] })),
    });

    assert.equal(empty.status, 400);
    assert.equal(oversized.status, 400);
    assert.equal(await FoodEntry.countDocuments(), 0);
  });
});

describe('preview input checks', () => {
  test('rejects a non-PDF upload', async () => {
    const result = await server.request(owner, 'POST', PREVIEW_PATH, pdfForm('hello', 'text/plain', 'notes.txt'));
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'UNSUPPORTED_FILE_TYPE');
  });

  test('rejects a file that claims to be a PDF but is not one', async () => {
    const result = await server.request(owner, 'POST', PREVIEW_PATH, pdfForm('not really a pdf', 'application/pdf'));
    assert.equal(result.status, 422);
    assert.equal(result.body.code, 'PDF_UNREADABLE');
  });

  test('requires a file', async () => {
    const result = await server.request(owner, 'POST', PREVIEW_PATH, new FormData());
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'PDF_REQUIRED');
  });
});

describe('import requires authentication', () => {
  test('preview and confirm return 401 without a session', async () => {
    const preview = await server.request(null, 'POST', PREVIEW_PATH, pdfForm('%PDF-', 'application/pdf'));
    const confirm = await server.request(null, 'POST', IMPORT_PATH, { entries: [importRow()] });

    assert.equal(preview.status, 401);
    assert.equal(confirm.status, 401);
    assert.equal(await FoodEntry.countDocuments(), 0);
  });
});
