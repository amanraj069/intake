import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { ChatMessage } from '../src/models/ChatMessage';
import { FoodEntry } from '../src/models/FoodEntry';
import { IdempotencyRecord } from '../src/models/IdempotencyRecord';

/** Write endpoints that accept an `Idempotency-Key`, end to end over HTTP. */

const CREATE_PATH = '/api/food-entries';
const CONFIRM_ACTION_PATH = '/api/chat/confirm-action';
const IMPORT_CONFIRM_PATH = '/api/food-entries/import/confirm';

const meal = {
  mealType: 'breakfast',
  date: '2026-09-07',
  items: [{ name: 'Rolled oats', quantity: 80, unit: 'g', calories: 310, macros: { proteinG: 11, carbG: 54, fatG: 6 } }],
};

function withKey(key: string): Record<string, string> {
  return { 'Idempotency-Key': key };
}

let server: TestServer;
let owner: TestUser;
let otherUser: TestUser;

before(async () => {
  server = await startTestServer();
  await IdempotencyRecord.init();
  owner = await createTestUser('idempotency-owner');
  otherUser = await createTestUser('idempotency-other');
});

beforeEach(async () => {
  await Promise.all([FoodEntry.deleteMany({}), IdempotencyRecord.deleteMany({}), ChatMessage.deleteMany({})]);
});

after(async () => {
  await server.close();
});

describe('creating a meal with an Idempotency-Key', () => {
  test('a retry with the same key replays the first response and saves one meal', async () => {
    const key = randomUUID();
    const first = await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));
    const retry = await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));

    assert.equal(first.status, 201);
    assert.equal(retry.status, 201);
    assert.equal(retry.headers.get('idempotent-replayed'), 'true');
    assert.equal(first.headers.get('idempotent-replayed'), null);
    assert.equal(retry.body.data.foodEntry._id, first.body.data.foodEntry._id);
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });

  test('a double tap (two requests at once) saves one meal', async () => {
    const key = randomUUID();
    const results = await Promise.all([
      server.request(owner, 'POST', CREATE_PATH, meal, withKey(key)),
      server.request(owner, 'POST', CREATE_PATH, meal, withKey(key)),
    ]);

    for (const result of results) {
      assert.ok(
        result.status === 201 || result.body.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
        `unexpected ${result.status} ${result.body.code}`
      );
    }
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });

  test('refuses a key reused for a different meal', async () => {
    const key = randomUUID();
    await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));
    const reused = await server.request(owner, 'POST', CREATE_PATH, { ...meal, mealType: 'lunch' }, withKey(key));

    assert.equal(reused.status, 422);
    assert.equal(reused.body.code, 'IDEMPOTENCY_KEY_REUSED');
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });

  test('keys are per user: the same key from another user is a separate request', async () => {
    const key = randomUUID();
    await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));
    const other = await server.request(otherUser, 'POST', CREATE_PATH, meal, withKey(key));

    assert.equal(other.status, 201);
    assert.equal(other.headers.get('idempotent-replayed'), null);
    assert.equal(await FoodEntry.countDocuments({ userId: otherUser.id }), 1);
  });

  test('without a key, every request still saves (the header is opt-in)', async () => {
    await server.request(owner, 'POST', CREATE_PATH, meal);
    await server.request(owner, 'POST', CREATE_PATH, meal);
    assert.equal(await FoodEntry.countDocuments({}), 2);
  });

  test('rejects a malformed key before saving anything', async () => {
    const result = await server.request(owner, 'POST', CREATE_PATH, meal, withKey('bad key!'));
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'INVALID_IDEMPOTENCY_KEY');
    assert.equal(await FoodEntry.countDocuments({}), 0);
  });

  test('a claim abandoned by a crashed request is taken over by its retry', async () => {
    const key = randomUUID();
    await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));
    // Simulate a crash mid-write: the record is still in progress, locked long ago.
    await IdempotencyRecord.updateOne({ key }, { $set: { state: 'in-progress', lockedAt: new Date(0) } });
    await FoodEntry.deleteMany({});

    const retry = await server.request(owner, 'POST', CREATE_PATH, meal, withKey(key));
    assert.equal(retry.status, 201);
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });
});

describe('confirming a chat action with an Idempotency-Key', () => {
  async function proposeMeal(user: TestUser): Promise<string> {
    const proposal = await ChatMessage.create({
      userId: user.id, role: 'assistant', content: 'Log breakfast', action: { tool: 'logMeal', status: 'pending' },
    });
    return proposal._id.toString();
  }

  test('a retry after a lost response gets the original success, not "already confirmed"', async () => {
    const messageId = await proposeMeal(owner);
    const body = { messageId, tool: 'logMeal', args: meal };
    const key = randomUUID();

    const first = await server.request(owner, 'POST', CONFIRM_ACTION_PATH, body, withKey(key));
    const retry = await server.request(owner, 'POST', CONFIRM_ACTION_PATH, body, withKey(key));

    assert.equal(first.status, 201);
    assert.equal(retry.status, 201);
    assert.equal(retry.body.data.foodEntry._id, first.body.data.foodEntry._id);
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });

  test('a failed attempt frees the key, so the same request can be retried', async () => {
    const messageId = await proposeMeal(owner);
    const tampered = { messageId, tool: 'logMeal', args: { ...meal, items: [{ ...meal.items[0], calories: -5 }] } };
    const key = randomUUID();

    const first = await server.request(owner, 'POST', CONFIRM_ACTION_PATH, tampered, withKey(key));
    const retry = await server.request(owner, 'POST', CONFIRM_ACTION_PATH, tampered, withKey(key));

    assert.equal(first.status, 400);
    assert.equal(retry.status, 400);
    assert.equal(retry.body.code, 'INVALID_CHAT_ACTION');
    assert.equal(await IdempotencyRecord.countDocuments({ key }), 0);
  });
});

describe('confirming a PDF import with an Idempotency-Key', () => {
  test('a retry reports the original import instead of every row as a duplicate', async () => {
    const key = randomUUID();
    const body = { entries: [meal] };

    const first = await server.request(owner, 'POST', IMPORT_CONFIRM_PATH, body, withKey(key));
    const retry = await server.request(owner, 'POST', IMPORT_CONFIRM_PATH, body, withKey(key));

    assert.deepEqual(first.body.data, { importedCount: 1, skipped: [] });
    assert.deepEqual(retry.body.data, first.body.data);
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });
});
