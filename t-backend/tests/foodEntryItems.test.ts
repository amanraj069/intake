import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';

/** Creating and editing a multi-item entry over HTTP: totals always come from the items. */

const ENTRIES_PATH = '/api/food-entries';

const roti = {
  name: 'Roti',
  quantity: 2,
  unit: 'count',
  calories: 240,
  macros: { proteinG: 6, carbG: 50, fatG: 2 },
  micros: { Iron: { amount: 2, unit: 'mg' } },
};
const paneerSabji = {
  name: 'Paneer sabji',
  quantity: 200,
  unit: 'g',
  calories: 320,
  macros: { proteinG: 18, carbG: 10, fatG: 24 },
  micros: { Iron: { amount: 1.5, unit: 'mg' }, Calcium: { amount: 400, unit: 'mg' } },
};

let server: TestServer;
let user: TestUser;

before(async () => {
  server = await startTestServer();
  user = await createTestUser('items');
});

after(async () => {
  await server.close();
});

describe('multi-item entries', () => {
  test('create stores each item and sums the totals, ignoring any totals the client sends', async () => {
    const result = await server.request(user, 'POST', ENTRIES_PATH, {
      mealType: 'lunch',
      date: '2026-09-13',
      items: [roti, paneerSabji],
      calories: 1,
      macros: { proteinG: 1, carbG: 1, fatG: 1 },
    });

    assert.equal(result.status, 201);
    const entry = result.body.data.foodEntry;
    assert.equal(entry.name, 'Roti + Paneer sabji');
    assert.deepEqual(
      entry.items.map((item: { name: string; quantity: number; unit: string }) => [item.name, item.quantity, item.unit]),
      [
        ['Roti', 2, 'count'],
        ['Paneer sabji', 200, 'g'],
      ]
    );
    assert.equal(entry.calories, 560);
    assert.deepEqual(entry.macros, { proteinG: 24, carbG: 60, fatG: 26 });
    assert.deepEqual(entry.micros, { Iron: { amount: 3.5, unit: 'mg' }, Calcium: { amount: 400, unit: 'mg' } });
  });

  test('editing items replaces the list and re-sums the totals', async () => {
    const created = await server.request(user, 'POST', ENTRIES_PATH, {
      mealType: 'dinner',
      date: '2026-09-13',
      items: [roti, paneerSabji],
    });

    const result = await server.request(user, 'PATCH', `${ENTRIES_PATH}/${created.body.data.foodEntry._id}`, {
      items: [{ ...roti, quantity: 3, calories: 360 }],
    });

    assert.equal(result.status, 200);
    const entry = result.body.data.foodEntry;
    assert.equal(entry.items.length, 1);
    assert.equal(entry.calories, 360);
    assert.deepEqual(entry.micros, { Iron: { amount: 2, unit: 'mg' } });
  });

  test('a given meal name is stored, and survives an edit to the items', async () => {
    const created = await server.request(user, 'POST', ENTRIES_PATH, {
      mealType: 'lunch',
      date: '2026-09-13',
      name: '  Roti sabji ',
      items: [roti, paneerSabji],
    });
    assert.equal(created.body.data.foodEntry.name, 'Roti sabji');

    const edited = await server.request(user, 'PATCH', `${ENTRIES_PATH}/${created.body.data.foodEntry._id}`, {
      items: [roti],
    });
    assert.equal(edited.body.data.foodEntry.name, 'Roti sabji');
  });

  test('a name that was only the items joined follows the items when they change', async () => {
    const created = await server.request(user, 'POST', ENTRIES_PATH, {
      mealType: 'lunch',
      date: '2026-09-13',
      name: '',
      items: [roti, paneerSabji],
    });
    assert.equal(created.body.data.foodEntry.name, 'Roti + Paneer sabji');

    const edited = await server.request(user, 'PATCH', `${ENTRIES_PATH}/${created.body.data.foodEntry._id}`, {
      items: [paneerSabji],
    });
    assert.equal(edited.body.data.foodEntry.name, 'Paneer sabji');
  });

  test('rejects an entry with no items or an unknown unit', async () => {
    const noItems = await server.request(user, 'POST', ENTRIES_PATH, { mealType: 'lunch', date: '2026-09-13', items: [] });
    const badUnit = await server.request(user, 'POST', ENTRIES_PATH, {
      mealType: 'lunch',
      date: '2026-09-13',
      items: [{ ...roti, unit: 'bowl' }],
    });

    assert.equal(noItems.status, 400);
    assert.equal(badUnit.status, 400);
    assert.match(JSON.stringify(badUnit.body.errors), /Unit must be g, ml or count/);
  });
});
