import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { SharedItem } from '../src/models/SharedItem';
import { today } from '../src/lib/calendarDay';

const MEAL_BODY = {
  mealType: 'dinner',
  date: today(),
  name: 'Paneer tikka',
  items: [
    { name: 'Paneer tikka', quantity: 200, unit: 'g', calories: 540, macros: { proteinG: 36, carbG: 12, fatG: 38 } },
  ],
};

let server: TestServer;
let owner: TestUser;
let recipient: TestUser;
let bystander: TestUser;
let mealId: string;

async function logMeal(user: TestUser): Promise<string> {
  const response = await server.request(user, 'POST', '/api/food-entries', MEAL_BODY);
  assert.equal(response.status, 201);
  return response.body.data.foodEntry._id;
}

before(async () => {
  server = await startTestServer();
  await SharedItem.init();
  owner = await createTestUser('share-owner');
  recipient = await createTestUser('share-recipient');
  bystander = await createTestUser('share-bystander');
  mealId = await logMeal(owner);
});

after(async () => {
  await server.close();
});

describe('POST /api/shared-meals', () => {
  test('rejects an email with no account behind it', async () => {
    const response = await server.request(owner, 'POST', '/api/shared-meals', {
      mealId,
      email: 'nobody@nowhere.test',
    });
    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'RECIPIENT_NOT_FOUND');
  });

  test('rejects sharing with yourself', async () => {
    const response = await server.request(owner, 'POST', '/api/shared-meals', { mealId, email: owner.email });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'CANNOT_SHARE_WITH_SELF');
  });

  test('rejects sharing a meal the caller does not own', async () => {
    const response = await server.request(bystander, 'POST', '/api/shared-meals', {
      mealId,
      email: recipient.email,
    });
    assert.equal(response.status, 403);
  });

  test('records the sharer from the token, whatever the email casing', async () => {
    const response = await server.request(owner, 'POST', '/api/shared-meals', {
      mealId,
      email: recipient.email.toUpperCase(),
    });
    assert.equal(response.status, 201);

    const stored = await SharedItem.findOne({ mealId }).lean();
    assert.equal(stored?.userIdSharing.toString(), owner.id);
    assert.equal(stored?.userIdShared.toString(), recipient.id);
  });

  test('rejects sharing the same meal with the same person twice', async () => {
    const response = await server.request(owner, 'POST', '/api/shared-meals', { mealId, email: recipient.email });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, 'ALREADY_SHARED');
  });
});

describe('GET /api/shared-meals', () => {
  test('lists the meal and who shared it for the recipient only', async () => {
    const forRecipient = await server.request(recipient, 'GET', '/api/shared-meals');
    assert.equal(forRecipient.status, 200);
    assert.equal(forRecipient.body.total, 1);
    assert.equal(forRecipient.body.data[0].meal._id, mealId);
    assert.equal(forRecipient.body.data[0].sharedBy.email, owner.email);

    const forBystander = await server.request(bystander, 'GET', '/api/shared-meals');
    assert.equal(forBystander.body.total, 0);
  });

  test('drops the share when the owner deletes the meal', async () => {
    const deleted = await server.request(owner, 'DELETE', `/api/food-entries/${mealId}`);
    assert.equal(deleted.status, 200);

    const forRecipient = await server.request(recipient, 'GET', '/api/shared-meals');
    assert.equal(forRecipient.body.total, 0);
  });
});
