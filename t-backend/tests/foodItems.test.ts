import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { sumItemNutrition } from '../src/lib/foodItemTotals';
import { toItemFromLegacyEntry } from '../src/lib/legacyFoodEntry';

const macros = (proteinG: number, carbG: number, fatG: number) => ({ proteinG, carbG, fatG });

describe('sumItemNutrition', () => {
  test('adds calories and macros across items, rounding float drift away', () => {
    const totals = sumItemNutrition([
      { calories: 240.1, macros: macros(6.1, 50.2, 2) },
      { calories: 320.2, macros: macros(18.2, 10, 24.1) },
    ]);

    assert.equal(totals.calories, 560.3);
    assert.deepEqual(totals.macros, macros(24.3, 60.2, 26.1));
  });

  test('sums the same micronutrient across items, converting mass units to mg', () => {
    const totals = sumItemNutrition([
      { calories: 0, macros: macros(0, 0, 0), micros: { Iron: { amount: 2, unit: 'mg' } } },
      { calories: 0, macros: macros(0, 0, 0), micros: { Iron: { amount: 500, unit: 'mcg' }, Sodium: { amount: 0.1, unit: 'g' } } },
    ]);

    assert.deepEqual(totals.micros, { Iron: { amount: 2.5, unit: 'mg' }, Sodium: { amount: 100, unit: 'mg' } });
  });

  test('keeps a non-mass unit apart instead of adding it to a mass amount', () => {
    const totals = sumItemNutrition([
      { calories: 0, macros: macros(0, 0, 0), micros: { 'Vitamin D': { amount: 5, unit: 'mcg' } } },
      { calories: 0, macros: macros(0, 0, 0), micros: { 'Vitamin D': { amount: 400, unit: 'IU' } } },
    ]);

    assert.deepEqual(totals.micros, {
      'Vitamin D': { amount: 0.005, unit: 'mg' },
      'Vitamin D (IU)': { amount: 400, unit: 'IU' },
    });
  });
});

describe('toItemFromLegacyEntry', () => {
  const legacy = { foodName: 'Oats', calories: 310, macros: macros(13, 48, 7) };

  test('grams per serving times servings becomes a gram amount', () => {
    const item = toItemFromLegacyEntry({ ...legacy, quantity: 2, quantityUnit: '250g' });
    assert.deepEqual([item.name, item.quantity, item.unit], ['Oats', 500, 'g']);
  });

  test('bare metric units and larger units convert to g or ml', () => {
    assert.deepEqual(
      [
        toItemFromLegacyEntry({ ...legacy, quantity: 150, quantityUnit: 'g' }),
        toItemFromLegacyEntry({ ...legacy, quantity: 0.5, quantityUnit: 'L' }),
        toItemFromLegacyEntry({ ...legacy, quantity: 1, quantityUnit: 'kg' }),
      ].map((item) => [item.quantity, item.unit]),
      [
        [150, 'g'],
        [500, 'ml'],
        [1000, 'g'],
      ]
    );
  });

  test('a counted unit becomes a count and stays visible in the name', () => {
    const item = toItemFromLegacyEntry({ ...legacy, foodName: 'Lentil soup', quantity: 1, quantityUnit: 'bowl' });
    assert.deepEqual([item.name, item.quantity, item.unit], ['Lentil soup (bowl)', 1, 'count']);
  });

  test('a generic serving unit becomes a plain count', () => {
    const item = toItemFromLegacyEntry({ ...legacy, quantity: 2, quantityUnit: 'serving' });
    assert.deepEqual([item.name, item.quantity, item.unit], ['Oats', 2, 'count']);
  });

  test('nutrition and legacy numeric micros carry over', () => {
    const item = toItemFromLegacyEntry({ ...legacy, quantity: 1, quantityUnit: 'g', micros: { Iron: 3 } });
    assert.equal(item.calories, 310);
    assert.deepEqual(item.micros, { Iron: { amount: 3, unit: 'mg' } });
  });
});
