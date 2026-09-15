import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { FoodEntry } from '../src/models/FoodEntry';
import { Goal } from '../src/models/Goal';
import { today } from '../src/lib/calendarDay';

/**
 * Two users log food and set goals on the same day. User A then attempts every
 * Stage 1-3 operation against user B's data, and must never see or change it.
 *
 * Goals are versioned by effective date, so the goal a POST /api/goals call
 * creates only covers today onward. LOG_DAY has to be today, or the daily
 * summary/series/goal-comparison checks below would be asking about a day
 * before the goal existed and correctly get no goal back.
 */
const LOG_DAY = today();
const RANGE = `startDate=${LOG_DAY}&endDate=${LOG_DAY}`;

/** Distinct numbers per user, so any leaked row shows up as a wrong total. */
const PROFILES = {
  a: { foodName: 'A oatmeal', calories: 500, proteinG: 20, carbG: 60, fatG: 10, calorieTarget: 1800, ironMg: 2 },
  b: { foodName: 'B steak', calories: 900, proteinG: 70, carbG: 5, fatG: 40, calorieTarget: 2600, ironMg: 7 },
};

type Profile = (typeof PROFILES)[keyof typeof PROFILES];

function foodEntryBody(profile: Profile) {
  return {
    mealType: 'lunch',
    date: LOG_DAY,
    items: [
      {
        name: profile.foodName,
        quantity: 250,
        unit: 'g',
        calories: profile.calories,
        macros: { proteinG: profile.proteinG, carbG: profile.carbG, fatG: profile.fatG },
        micros: { iron: { amount: profile.ironMg, unit: 'mg' } },
      },
    ],
  };
}

function goalBody(profile: Profile) {
  return { dailyCalorieTarget: profile.calorieTarget, proteinTargetG: 100, carbTargetG: 200, fatTargetG: 60 };
}

function assertDenied(status: number): void {
  assert.ok(status === 403 || status === 404, `expected 403 or 404, got ${status}`);
}

let server: TestServer;
let userA: TestUser;
let userB: TestUser;
let entryIdA: string;
let entryIdB: string;

async function seedUser(user: TestUser, profile: Profile): Promise<string> {
  const goal = await server.request(user, 'POST', '/api/goals', goalBody(profile));
  assert.equal(goal.status, 200);
  const entry = await server.request(user, 'POST', '/api/food-entries', foodEntryBody(profile));
  assert.equal(entry.status, 201);
  return entry.body.data.foodEntry._id;
}

before(async () => {
  server = await startTestServer();
  userA = await createTestUser('user-a');
  userB = await createTestUser('user-b');
  entryIdA = await seedUser(userA, PROFILES.a);
  entryIdB = await seedUser(userB, PROFILES.b);
});

after(async () => {
  await server.close();
});

describe('food entry by id: user A cannot touch user B entry', () => {
  test('read is denied and leaks nothing', async () => {
    const result = await server.request(userA, 'GET', `/api/food-entries/${entryIdB}`);
    assertDenied(result.status);
    assert.equal(result.body.data, undefined);
    assert.ok(!JSON.stringify(result.body).includes(PROFILES.b.foodName));
  });

  test('edit is denied and the entry is unchanged', async () => {
    const hijacked = foodEntryBody(PROFILES.a).items.map((item) => ({ ...item, name: 'hijacked', calories: 1 }));
    const result = await server.request(userA, 'PATCH', `/api/food-entries/${entryIdB}`, { items: hijacked });
    assertDenied(result.status);
    const stored = await FoodEntry.findById(entryIdB).lean();
    assert.equal(stored?.items[0].name, PROFILES.b.foodName);
    assert.equal(stored?.calories, PROFILES.b.calories);
  });

  test('delete is denied and the entry still exists', async () => {
    const result = await server.request(userA, 'DELETE', `/api/food-entries/${entryIdB}`);
    assertDenied(result.status);
    assert.ok(await FoodEntry.exists({ _id: entryIdB }));
  });

  test('user A can still read their own entry', async () => {
    const result = await server.request(userA, 'GET', `/api/food-entries/${entryIdA}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.foodEntry.items[0].name, PROFILES.a.foodName);
  });
});

describe('ownership comes from the session, never the request', () => {
  test('a userId in the create body is ignored', async () => {
    const result = await server.request(userA, 'POST', '/api/food-entries', {
      ...foodEntryBody(PROFILES.a),
      userId: userB.id,
    });
    assert.equal(result.status, 201);
    const stored = await FoodEntry.findById(result.body.data.foodEntry._id).lean();
    assert.equal(stored?.userId.toString(), userA.id);
    await FoodEntry.deleteOne({ _id: result.body.data.foodEntry._id });
  });

  test('a userId in the update body cannot reassign an entry', async () => {
    const result = await server.request(userA, 'PATCH', `/api/food-entries/${entryIdA}`, {
      mealType: 'dinner',
      userId: userB.id,
    });
    assert.equal(result.status, 200);
    const stored = await FoodEntry.findById(entryIdA).lean();
    assert.equal(stored?.userId.toString(), userA.id);
  });

  test('a userId in the goal body cannot overwrite user B goal', async () => {
    const result = await server.request(userA, 'POST', '/api/goals', {
      ...goalBody(PROFILES.a),
      userId: userB.id,
    });
    assert.equal(result.status, 200);
    const goalB = await Goal.findOne({ userId: userB.id }).lean();
    assert.equal(goalB?.dailyCalorieTarget, PROFILES.b.calorieTarget);
  });
});

describe('listing, summary and goal return only the caller data', () => {
  test('list ignores a userId query param', async () => {
    const result = await server.request(userA, 'GET', `/api/food-entries?${RANGE}&userId=${userB.id}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.total, 1);
    assert.deepEqual(
      result.body.data.map((entry: { items: { name: string }[] }) => entry.items[0].name),
      [PROFILES.a.foodName]
    );
  });

  test('daily summary totals and goal are user A only', async () => {
    const result = await server.request(userA, 'GET', `/api/food-entries/summary?date=${LOG_DAY}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.totals.calories, PROFILES.a.calories);
    assert.equal(result.body.data.totals.entryCount, 1);
    assert.equal(result.body.data.goal.dailyCalorieTarget, PROFILES.a.calorieTarget);
  });

  test('daily series totals are user A only', async () => {
    const result = await server.request(userA, 'GET', `/api/food-entries/series?${RANGE}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.days[0].totals.calories, PROFILES.a.calories);
    assert.equal(result.body.data.goal.userId, userA.id);
  });

  test('goal endpoint returns user A goal', async () => {
    const result = await server.request(userA, 'GET', `/api/goals?userId=${userB.id}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.goal.userId, userA.id);
    assert.equal(result.body.data.goal.dailyCalorieTarget, PROFILES.a.calorieTarget);
  });
});

describe('reports aggregate only the caller data', () => {
  test('weekly calories', async () => {
    const result = await server.request(userA, 'GET', `/api/reports/weekly-calories?${RANGE}&userId=${userB.id}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, [{ date: LOG_DAY, totalCalories: PROFILES.a.calories }]);
  });

  test('macros', async () => {
    const result = await server.request(userA, 'GET', `/api/reports/macros?${RANGE}`);
    assert.equal(result.status, 200);
    const { proteinG, carbG, fatG } = PROFILES.a;
    assert.deepEqual(result.body.data, [{ period: LOG_DAY, proteinG, carbG, fatG }]);
  });

  test('micros', async () => {
    const result = await server.request(userA, 'GET', `/api/reports/micros?${RANGE}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, [{ nutrient: 'iron', amount: PROFILES.a.ironMg, unit: 'mg' }]);
  });

  test('goal comparison', async () => {
    const result = await server.request(userA, 'GET', `/api/reports/goal-comparison?${RANGE}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, [
      { date: LOG_DAY, actualCalories: PROFILES.a.calories, targetCalories: PROFILES.a.calorieTarget },
    ]);
  });
});

describe('unauthenticated requests are rejected', () => {
  const protectedPaths = [
    '/api/goals',
    '/api/food-entries',
    '/api/food-entries/summary',
    `/api/food-entries/series?${RANGE}`,
    '/api/reports/weekly-calories',
    '/api/reports/macros',
    '/api/reports/micros',
    '/api/reports/goal-comparison',
  ];

  for (const path of protectedPaths) {
    test(`GET ${path} returns 401`, async () => {
      const result = await server.request(null, 'GET', path);
      assert.equal(result.status, 401);
    });
  }
});

describe('userId indexes', () => {
  test('Goal has a unique index on userId', async () => {
    const indexes = await Goal.collection.indexes();
    const userIdIndex = indexes.find((index) => Object.keys(index.key)[0] === 'userId');
    assert.ok(userIdIndex?.unique, 'expected a unique userId index on goals');
  });

  test('FoodEntry has an index led by userId', async () => {
    const indexes = await FoodEntry.collection.indexes();
    assert.ok(
      indexes.some((index) => Object.keys(index.key)[0] === 'userId'),
      'expected an index whose first key is userId on foodentries'
    );
  });
});
