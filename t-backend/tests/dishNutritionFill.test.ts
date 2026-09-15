import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFilledDishNutrition,
  chunkCandidates,
  findMissingNutritionCandidates,
  itemNeedsNutritionFill,
} from '../src/lib/dishNutritionFill';
import { AiDiaryItem, AiDiaryRow, aiDiaryRowSchema } from '../src/lib/foodDiaryImportPrompt';
import { toPreviewRow } from '../src/lib/foodDiaryRows';

function makeItem(overrides: Partial<AiDiaryItem> = {}): AiDiaryItem {
  return {
    name: 'Oatmeal',
    unit: 'g',
    quantity: 250,
    quantityEstimated: false,
    calories: 170,
    proteinG: 6,
    carbG: 30,
    fatG: 3,
    nutritionEstimated: false,
    ...overrides,
  };
}

function makeRow(items: AiDiaryItem[], overrides: Partial<AiDiaryRow> = {}): AiDiaryRow {
  return aiDiaryRowSchema.parse({
    sourceText: '08 Sep 2026 Breakfast Oatmeal with banana 1 bowl',
    date: '2026-09-08',
    mealType: 'breakfast',
    name: 'Oatmeal with banana',
    items,
    nutritionSplitEstimated: false,
    ...overrides,
  });
}

describe('itemNeedsNutritionFill', () => {
  test('returns true when calories is null', () => {
    assert.equal(itemNeedsNutritionFill(makeItem({ calories: null })), true);
  });

  test('returns true when any macro is null', () => {
    assert.equal(itemNeedsNutritionFill(makeItem({ proteinG: null })), true);
    assert.equal(itemNeedsNutritionFill(makeItem({ carbG: null })), true);
    assert.equal(itemNeedsNutritionFill(makeItem({ fatG: null })), true);
  });

  test('returns true when quantity is null or 0', () => {
    assert.equal(itemNeedsNutritionFill(makeItem({ quantity: null })), true);
    assert.equal(itemNeedsNutritionFill(makeItem({ quantity: 0 })), true);
  });

  test('returns false when all nutrition and quantity values are present', () => {
    assert.equal(itemNeedsNutritionFill(makeItem()), false);
  });

  test('returns false when item has no name', () => {
    assert.equal(itemNeedsNutritionFill(makeItem({ name: null, calories: null })), false);
    assert.equal(itemNeedsNutritionFill(makeItem({ name: '   ', calories: null })), false);
  });
});

describe('findMissingNutritionCandidates', () => {
  test('collects dishes with missing values and assigns rowIndex_itemIndex IDs', () => {
    const rows = [
      makeRow([
        makeItem({ name: 'Oatmeal', calories: null, proteinG: null, carbG: null, fatG: null }),
        makeItem({ name: 'Banana', unit: 'count', quantity: 1, calories: null, proteinG: null, carbG: null, fatG: null }),
      ]),
      makeRow([
        makeItem({ name: 'Greek yogurt', calories: 130, proteinG: 15, carbG: 6, fatG: 4 }), // complete
        makeItem({ name: 'Honey', quantity: null, calories: null, proteinG: null, carbG: null, fatG: null }), // missing
      ]),
    ];

    const candidates = findMissingNutritionCandidates(rows);

    assert.equal(candidates.length, 3);
    assert.deepEqual(
      candidates.map((c) => ({ id: c.id, name: c.name })),
      [
        { id: '0_0', name: 'Oatmeal' },
        { id: '0_1', name: 'Banana' },
        { id: '1_1', name: 'Honey' },
      ]
    );
  });

  test('returns empty array when no dishes have missing values', () => {
    const rows = [makeRow([makeItem()])];
    assert.deepEqual(findMissingNutritionCandidates(rows), []);
  });
});

describe('chunkCandidates', () => {
  test('splits candidate array into batches of multiple dishes', () => {
    const candidates = Array.from({ length: 55 }, (_, i) => ({
      id: `${i}_0`,
      name: `Dish ${i}`,
      quantity: 100,
      unit: 'g' as const,
      calories: null,
      proteinG: null,
      carbG: null,
      fatG: null,
    }));

    const batches = chunkCandidates(candidates, 25);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].length, 25);
    assert.equal(batches[1].length, 25);
    assert.equal(batches[2].length, 5);
  });

  test('returns empty array for empty candidates', () => {
    assert.deepEqual(chunkCandidates([]), []);
  });
});

describe('applyFilledDishNutrition', () => {
  test('fills missing calories and macros for matching dishes, preserving existing values', () => {
    const rows = [
      makeRow([
        makeItem({ name: 'Oatmeal', quantity: 250, calories: null, proteinG: null, carbG: null, fatG: null }),
        makeItem({ name: 'Banana', unit: 'count', quantity: 1, calories: null, proteinG: null, carbG: null, fatG: null }),
      ]),
      makeRow([
        makeItem({ name: 'Chicken rice', calories: 500, proteinG: null, carbG: null, fatG: null }), // calories known
      ]),
    ];

    const filledDishes = [
      { id: '0_0', quantity: 250, unit: 'g' as const, calories: 170, proteinG: 6, carbG: 30, fatG: 3 },
      { id: '0_1', quantity: 1, unit: 'count' as const, calories: 105, proteinG: 1.3, carbG: 27, fatG: 0.4 },
      { id: '1_0', quantity: 300, unit: 'g' as const, calories: 450, proteinG: 25, carbG: 60, fatG: 10 },
    ];

    const updated = applyFilledDishNutrition(rows, filledDishes);

    // Row 0 Item 0: Oatmeal
    assert.equal(updated[0].items[0].calories, 170);
    assert.equal(updated[0].items[0].proteinG, 6);
    assert.equal(updated[0].items[0].carbG, 30);
    assert.equal(updated[0].items[0].fatG, 3);
    assert.equal(updated[0].items[0].nutritionEstimated, true);

    // Row 0 Item 1: Banana
    assert.equal(updated[0].items[1].calories, 105);
    assert.equal(updated[0].items[1].proteinG, 1.3);
    assert.equal(updated[0].items[1].carbG, 27);
    assert.equal(updated[0].items[1].fatG, 0.4);
    assert.equal(updated[0].items[1].nutritionEstimated, true);

    // Row 1 Item 0: Chicken rice - original calories (500) kept, macros filled
    assert.equal(updated[1].items[0].calories, 500);
    assert.equal(updated[1].items[0].proteinG, 25);
    assert.equal(updated[1].items[0].carbG, 60);
    assert.equal(updated[1].items[0].fatG, 10);
    assert.equal(updated[1].items[0].nutritionEstimated, true);
  });

  test('fills missing quantity when quantity was null and marks quantityEstimated', () => {
    const rows = [
      makeRow([
        makeItem({ name: 'Apple', quantity: null, calories: null, proteinG: null, carbG: null, fatG: null }),
      ]),
    ];

    const filledDishes = [
      { id: '0_0', quantity: 1, unit: 'count' as const, calories: 95, proteinG: 0.5, carbG: 25, fatG: 0.3 },
    ];

    const updated = applyFilledDishNutrition(rows, filledDishes);
    assert.equal(updated[0].items[0].quantity, 1);
    assert.equal(updated[0].items[0].unit, 'count');
    assert.equal(updated[0].items[0].quantityEstimated, true);
    assert.equal(updated[0].items[0].calories, 95);
  });

  test('toPreviewRow generates friendly AI estimation review issue without required-field errors', () => {
    const row = makeRow([
      makeItem({
        name: 'Oatmeal',
        quantity: 250,
        calories: 170,
        proteinG: 6,
        carbG: 30,
        fatG: 3,
        nutritionEstimated: true,
      }),
      makeItem({
        name: 'Banana',
        unit: 'count',
        quantity: 1,
        calories: 105,
        proteinG: 1.3,
        carbG: 27,
        fatG: 0.4,
        nutritionEstimated: true,
      }),
    ]);

    const preview = toPreviewRow(row, 0);

    assert.equal(preview.status, 'needs-review');
    assert.equal(preview.values.items[0].calories, 170);
    assert.equal(preview.values.items[1].calories, 105);
    assert.deepEqual(preview.issues, [
      'Nutrition for Oatmeal and Banana was estimated by AI: verify before importing.',
    ]);
  });
});
