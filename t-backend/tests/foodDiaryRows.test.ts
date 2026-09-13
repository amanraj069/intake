import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { AiDiaryRow, aiDiaryRowSchema } from '../src/lib/foodDiaryImportPrompt';
import { toPreviewRow } from '../src/lib/foodDiaryRows';

function modelItem(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Roti',
    unit: 'count',
    quantity: 2,
    quantityEstimated: false,
    calories: 240,
    proteinG: 6,
    carbG: 50,
    fatG: 2,
    ...overrides,
  };
}

/** A cleanly read line, as the validated model output would carry it. */
function modelRow(overrides: Record<string, unknown> = {}): AiDiaryRow {
  return aiDiaryRowSchema.parse({
    sourceText: 'Lunch Paneer sabji with 2 rotis 2 rotis, 200 g 560 24 60 26',
    date: '2026-09-07',
    mealType: 'lunch',
    name: 'Paneer sabji with rotis',
    items: [modelItem(), modelItem({ name: 'Paneer sabji', unit: 'g', quantity: 200, calories: 320, proteinG: 18, carbG: 10, fatG: 24 })],
    nutritionSplitEstimated: false,
    ...overrides,
  });
}

describe('toPreviewRow', () => {
  test('a clean multi-item line is ready, with each item keeping its own unit', () => {
    const row = toPreviewRow(modelRow(), 0);

    assert.equal(row.status, 'ready');
    assert.deepEqual(row.issues, []);
    assert.equal(row.rowNumber, 1);
    assert.equal(row.values.name, 'Paneer sabji with rotis');
    assert.deepEqual(
      row.values.items.map((item) => [item.name, item.quantity, item.unit]),
      [
        ['Roti', 2, 'count'],
        ['Paneer sabji', 200, 'g'],
      ]
    );
  });

  test('nutrition split across items by the model flags the row', () => {
    const row = toPreviewRow(modelRow({ nutritionSplitEstimated: true }), 0);

    assert.equal(row.status, 'needs-review');
    assert.match(row.issues.join(' '), /one set of numbers for these 2 items/);
  });

  test('an estimated household measure is named in the flag', () => {
    const items = [modelItem({ name: 'Lentil soup', unit: 'g', quantity: 250, quantityEstimated: true })];
    const row = toPreviewRow(modelRow({ items }), 0);

    assert.equal(row.status, 'needs-review');
    assert.match(row.issues.join(' '), /amount of Lentil soup is estimated/);
  });

  test('blank macros flag the row and name the item, instead of being filled in', () => {
    const items = [modelItem(), modelItem({ name: 'Dal', unit: 'g', quantity: 150, proteinG: null, carbG: null, fatG: null })];
    const row = toPreviewRow(modelRow({ items }), 3);

    assert.equal(row.status, 'needs-review');
    assert.equal(row.values.items[1].proteinG, null);
    assert.match(row.issues.join(' '), /Protein, carbs or fat for Dal are missing/);
  });

  test("the model's uncertainty is surfaced even when every value is present", () => {
    const row = toPreviewRow(modelRow({ uncertainReason: 'Calories are smudged.' }), 0);
    assert.equal(row.status, 'needs-review');
    assert.deepEqual(row.issues, ['Calories are smudged.']);
  });

  test('an unknown meal, an impossible date and no items all flag the row', () => {
    const row = toPreviewRow(modelRow({ mealType: 'unknown', date: '2026-02-31', items: [] }), 0);

    assert.equal(row.values.mealType, null);
    assert.equal(row.values.date, null);
    assert.equal(row.issues.length, 3);
  });

  test('values outside the single-entry limits are flagged with the item and schema message', () => {
    const row = toPreviewRow(modelRow({ items: [modelItem({ calories: 25000 })] }), 0);
    assert.equal(row.status, 'needs-review');
    assert.match(row.issues.join(' '), /Item 1: Calories must be at most 20000/);
  });
});
