import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { applyDishSplits, distributeTotal, findSplitCandidates } from '../src/lib/dishSplit';
import { AiDiaryRow, aiDiaryRowSchema } from '../src/lib/foodDiaryImportPrompt';

function rowWithItem(item: Record<string, unknown>): AiDiaryRow {
  return aiDiaryRowSchema.parse({
    sourceText: '09 Sep 2026 Lunch Dal, rice and mixed vegetables 1 plate 570 21 91 12',
    date: '2026-09-09',
    mealType: 'lunch',
    name: 'Dal, rice and mixed vegetables',
    items: [{ unit: 'g', quantity: 400, quantityEstimated: true, calories: 570, proteinG: 21, carbG: 91, fatG: 12, ...item }],
  });
}

const dalRiceVeg = [
  { name: 'Dal', unit: 'g', quantity: 150, calories: 180, proteinG: 10, carbG: 25, fatG: 4 },
  { name: 'Steamed rice', unit: 'g', quantity: 150, calories: 200, proteinG: 4, carbG: 45, fatG: 1 },
  { name: 'Mixed vegetables', unit: 'g', quantity: 100, calories: 100, proteinG: 3, carbG: 12, fatG: 5 },
] as const;

describe('findSplitCandidates', () => {
  test('nominates a single item whose name joins several foods', () => {
    const rows = [rowWithItem({ name: 'Dal, rice and mixed vegetables' }), rowWithItem({ name: 'Chicken wrap' })];
    assert.deepEqual(
      findSplitCandidates(rows).map((candidate) => [candidate.id, candidate.name]),
      [['0', 'Dal, rice and mixed vegetables']]
    );
  });
});

describe('distributeTotal', () => {
  test('shares add up exactly to the total after rounding', () => {
    const shares = distributeTotal(12, [1, 1, 1], 10);
    assert.equal(Math.round(shares.reduce((sum, share) => sum + share, 0) * 10), 120);
  });

  test('falls back to equal shares when no weights are given', () => {
    assert.deepEqual(distributeTotal(90, [0, 0, 0], 1), [30, 30, 30]);
  });
});

describe('applyDishSplits', () => {
  test('replaces the combined item with dishes that add up to the printed numbers', () => {
    const [row] = applyDishSplits([rowWithItem({ name: 'Dal, rice and mixed vegetables' })], {
      entries: [{ id: '0', dishes: [...dalRiceVeg] }],
    });

    assert.deepEqual(row.items.map((item) => item.name), ['Dal', 'Steamed rice', 'Mixed vegetables']);
    assert.equal(row.nutritionSplitEstimated, true);
    const total = (field: 'quantity' | 'calories' | 'proteinG' | 'carbG' | 'fatG') =>
      Math.round(row.items.reduce((sum, item) => sum + (item[field] ?? 0), 0) * 10) / 10;
    assert.deepEqual([total('quantity'), total('calories'), total('proteinG'), total('carbG'), total('fatG')], [400, 570, 21, 91, 12]);
  });

  test('a one-dish answer leaves the row as read', () => {
    const original = rowWithItem({ name: 'Mac and cheese' });
    const [row] = applyDishSplits([original], { entries: [{ id: '0', dishes: [{ ...dalRiceVeg[0], name: 'Mac and cheese' }] }] });
    assert.equal(row, original);
  });

  test('a blank printed value stays blank on every dish', () => {
    const [row] = applyDishSplits([rowWithItem({ name: 'Dal, rice and mixed vegetables', fatG: null })], {
      entries: [{ id: '0', dishes: [...dalRiceVeg] }],
    });
    assert.deepEqual(row.items.map((item) => item.fatG), [null, null, null]);
  });
});
