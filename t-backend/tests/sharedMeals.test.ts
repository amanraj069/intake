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

describe('GET /api/shared-meals/sent', () => {
  test('lists the meal once, with everyone it went to, for the sharer only', async () => {
    const shared = await server.request(owner, 'POST', '/api/shared-meals', { mealId, email: bystander.email });
    assert.equal(shared.status, 201);

    const forOwner = await server.request(owner, 'GET', '/api/shared-meals/sent');
    assert.equal(forOwner.status, 200);
    assert.equal(forOwner.body.total, 1);
    assert.equal(forOwner.body.data[0].meal._id, mealId);
    assert.deepEqual(
      forOwner.body.data[0].sharedWith.map((user: { email: string }) => user.email),
      [recipient.email, bystander.email]
    );

    const forRecipient = await server.request(recipient, 'GET', '/api/shared-meals/sent');
    assert.equal(forRecipient.body.total, 0);
  });

  test('rejects an out-of-range page size', async () => {
    const response = await server.request(owner, 'GET', '/api/shared-meals/sent?limit=1000');
    assert.equal(response.status, 400);
  });
});

describe('PATCH /api/shared-meals/:mealId/access', () => {
  test('rejects an empty list of people to revoke', async () => {
    const response = await server.request(owner, 'PATCH', `/api/shared-meals/${mealId}/access`, { revokeUserIds: [] });
    assert.equal(response.status, 400);
  });

  test('refuses anyone but the owner', async () => {
    const response = await server.request(recipient, 'PATCH', `/api/shared-meals/${mealId}/access`, {
      revokeUserIds: [bystander.id],
    });
    assert.equal(response.status, 403);
  });

  test('removes the meal for the revoked person and keeps it for the rest', async () => {
    const response = await server.request(owner, 'PATCH', `/api/shared-meals/${mealId}/access`, {
      revokeUserIds: [bystander.id],
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.revokedCount, 1);
    assert.deepEqual(
      response.body.data.sharedWith.map((user: { id: string }) => user.id),
      [recipient.id]
    );

    const forBystander = await server.request(bystander, 'GET', '/api/shared-meals');
    assert.equal(forBystander.body.total, 0);
  });

  test('treats revoking someone without access as a no-op', async () => {
    const response = await server.request(owner, 'PATCH', `/api/shared-meals/${mealId}/access`, {
      revokeUserIds: [bystander.id],
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.revokedCount, 0);
    assert.equal(response.body.data.sharedWith.length, 1);
  });
});

describe('GET /api/shared-meals/received/:shareId', () => {
  test('returns the full meal to the recipient', async () => {
    const list = await server.request(recipient, 'GET', '/api/shared-meals');
    const shareId = list.body.data[0].id;

    const response = await server.request(recipient, 'GET', `/api/shared-meals/received/${shareId}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.meal._id, mealId);
    assert.equal(response.body.data.meal.items[0].name, 'Paneer tikka');
    assert.equal(response.body.data.sharedBy.email, owner.email);
  });

  test('reads as missing for anyone else, including the owner', async () => {
    const list = await server.request(recipient, 'GET', '/api/shared-meals');
    const shareId = list.body.data[0].id;

    const forOwner = await server.request(owner, 'GET', `/api/shared-meals/received/${shareId}`);
    assert.equal(forOwner.status, 404);
    assert.equal(forOwner.body.code, 'SHARED_MEAL_NOT_FOUND');
  });

  test('rejects a malformed share id', async () => {
    const response = await server.request(recipient, 'GET', '/api/shared-meals/received/not-an-id');
    assert.equal(response.status, 400);
  });
});

describe('unseen shares', () => {
  test('counts a new share as unseen for the recipient only', async () => {
    const forRecipient = await server.request(recipient, 'GET', '/api/shared-meals/unseen-count');
    assert.equal(forRecipient.status, 200);
    assert.equal(forRecipient.body.data.count, 1);

    const forOwner = await server.request(owner, 'GET', '/api/shared-meals/unseen-count');
    assert.equal(forOwner.body.data.count, 0);
  });

  test('flags the share as unseen in the list until it is marked seen', async () => {
    const before = await server.request(recipient, 'GET', '/api/shared-meals');
    const share = before.body.data[0];
    assert.equal(share.seen, false);

    const ignored = await server.request(owner, 'PATCH', '/api/shared-meals/seen', { shareIds: [share.id] });
    assert.equal(ignored.body.data.markedCount, 0);

    const marked = await server.request(recipient, 'PATCH', '/api/shared-meals/seen', { shareIds: [share.id] });
    assert.equal(marked.status, 200);
    assert.equal(marked.body.data.markedCount, 1);

    const after = await server.request(recipient, 'GET', '/api/shared-meals');
    assert.equal(after.body.data[0].seen, true);

    const count = await server.request(recipient, 'GET', '/api/shared-meals/unseen-count');
    assert.equal(count.body.data.count, 0);
  });

  test('rejects an empty list of shares to mark', async () => {
    const response = await server.request(recipient, 'PATCH', '/api/shared-meals/seen', { shareIds: [] });
    assert.equal(response.status, 400);
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

    const forOwner = await server.request(owner, 'GET', '/api/shared-meals/sent');
    assert.equal(forOwner.body.total, 0);
  });
});
