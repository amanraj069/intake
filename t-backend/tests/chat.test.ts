import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { ChatMessage } from '../src/models/ChatMessage';
import { FoodEntry } from '../src/models/FoodEntry';
import { Goal } from '../src/models/Goal';
import { AppError } from '../src/middleware/errorHandler';
import { ConversationTurnGenerator, ConversationTurnRequest, GeminiContent } from '../src/lib/gemini/geminiConversation';
import { MAX_AGENT_ITERATIONS, runChatTurn } from '../src/services/chatAgent';
import { toConversationContents } from '../src/services/chat/conversationContents';
import { extractPublicIdFromUrl } from '../src/lib/cloudinary';

/**
 * The agent loop runs against a scripted model, so tool dispatch, pending
 * actions and the iteration cap are checked without a network call. The HTTP
 * routes run with no Gemini keys configured, which is exactly the "provider
 * unavailable" case the endpoint must survive.
 */

for (const name of Object.keys(process.env)) {
  if (/^GEMINI_KEY\d+$/.test(name)) delete process.env[name];
}

const TODAY = '2026-09-14';

let server: TestServer;
let userA: TestUser;
let userB: TestUser;

function modelText(text: string): GeminiContent {
  return { role: 'model', parts: [{ text }] };
}

function modelCall(name: string, args: Record<string, unknown> = {}): GeminiContent {
  return { role: 'model', parts: [{ functionCall: { name, args }, thoughtSignature: 'sig' }] };
}

/** Replays the given turns in order and records every request the loop sent. */
function scriptedModel(turns: GeminiContent[]) {
  const requests: ConversationTurnRequest[] = [];
  const generateTurn: ConversationTurnGenerator = async (request) => {
    requests.push({ ...request, contents: structuredClone(request.contents) });
    const next = turns.shift();
    if (!next) throw new Error('The script ran out of model turns');
    return next;
  };
  return { generateTurn, requests };
}

const EGGS_MEAL = {
  mealType: 'breakfast',
  items: [{ name: 'Egg', unit: 'count', quantity: 2, calories: 156, proteinG: 12.6, carbG: 1.2, fatG: 10.6 }],
};

before(async () => {
  server = await startTestServer();
  userA = await createTestUser('chat-a');
  userB = await createTestUser('chat-b');
});

after(async () => {
  await server.close();
});

beforeEach(async () => {
  await Promise.all([ChatMessage.deleteMany({}), FoodEntry.deleteMany({}), Goal.deleteMany({})]);
});

describe('conversation contents', () => {
  test('merge consecutive turns and never open on the assistant', () => {
    const contents = toConversationContents(
      [
        { role: 'assistant', content: 'orphaned reply' },
        { role: 'user', content: 'log my eggs' },
        { role: 'assistant', content: 'Here is your summary.' },
        { role: 'assistant', content: 'Anything else?' },
      ],
      'thanks'
    );

    assert.deepEqual(
      contents.map((content) => [content.role, content.parts.length]),
      [['user', 1], ['model', 2], ['user', 1]]
    );
  });

  test("tell the model whether a proposed change was saved", () => {
    const [, proposal] = toConversationContents(
      [
        { role: 'user', content: 'log my eggs' },
        { role: 'assistant', content: 'Log breakfast for today: Egg x2', actionStatus: 'confirmed' },
      ],
      'thanks'
    );

    assert.match(String(proposal.parts[0].text), /Egg x2\n\(Saved: the user confirmed this change\.\)/);
  });
});

describe('photo messages', () => {
  const photo = { mimeType: 'image/jpeg', data: Buffer.from('jpeg-bytes') };

  test('send the new photo ahead of its caption', () => {
    const [message] = toConversationContents([], 'calories in this?', photo);

    assert.deepEqual(message.parts[0], { inlineData: { mimeType: 'image/jpeg', data: photo.data.toString('base64') } });
    assert.equal(message.parts[1].text, 'calories in this?');
  });

  test('describe a photo sent without a caption instead of sending empty text', () => {
    const [message] = toConversationContents([], '', photo);

    assert.match(String(message.parts[1].text), /no message/);
  });

  test('note an earlier photo rather than re-sending it', () => {
    const [earlier] = toConversationContents([{ role: 'user', content: '', hadImage: true }], 'log it as lunch');

    assert.equal(earlier.parts.length, 2);
    assert.match(String(earlier.parts[0].text), /attached a food photo/);
    assert.equal('inlineData' in earlier.parts[0], false);
  });
});

describe('agent loop', () => {
  test('a read tool runs at once and its real numbers reach the model', async () => {
    await server.request(userA, 'POST', '/api/goals', {
      dailyCalorieTarget: 2100, proteinTargetG: 140, carbTargetG: 220, fatTargetG: 70,
    });
    const model = scriptedModel([modelCall('getGoal'), modelText('Your target is 2,100 kcal.')]);

    const result = await runChatTurn({
      history: [], message: 'what is my goal?', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.equal(result.reply, 'Your target is 2,100 kcal.');
    assert.equal(result.pendingAction, null);
    const toolTurn = model.requests[1].contents.at(-1);
    assert.equal(toolTurn?.parts[0].functionResponse?.name, 'getGoal');
    assert.equal(
      (toolTurn?.parts[0].functionResponse?.response.result as { goal: { dailyCalorieTarget: number } }).goal.dailyCalorieTarget,
      2100
    );
    assert.equal(model.requests[1].contents.at(-2)?.parts[0].thoughtSignature, 'sig', 'model turn replayed verbatim');
  });

  test('a write tool becomes a pending action and saves nothing', async () => {
    const model = scriptedModel([modelCall('logMeal', EGGS_MEAL)]);

    const result = await runChatTurn({
      history: [], message: 'I had 2 eggs for breakfast', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.equal(result.pendingAction?.tool, 'logMeal');
    assert.match(result.reply, /Log breakfast for today: Egg x2: 156 kcal/);
    assert.equal(result.pendingAction?.args.date, TODAY);
    assert.deepEqual((result.pendingAction?.args.items as { macros: unknown }[])[0].macros, {
      proteinG: 12.6, carbG: 1.2, fatG: 10.6,
    });
    assert.equal(await FoodEntry.countDocuments({}), 0);
  });

  test('logged items keep catalog micronutrients, converted to mg', async () => {
    const micronutrients = [
      { name: 'Selenium', amount: 30, unit: 'mcg' },
      { name: 'Unobtainium', amount: 5, unit: 'mg' },
    ];
    const meal = { ...EGGS_MEAL, items: [{ ...EGGS_MEAL.items[0], micronutrients }] };
    const model = scriptedModel([modelCall('logMeal', meal)]);

    const result = await runChatTurn({
      history: [], message: 'I had 2 eggs for breakfast', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.deepEqual((result.pendingAction?.args.items as { micros: unknown }[])[0].micros, {
      Selenium: { amount: 0.03, unit: 'mg' },
    });
  });

  test('a meal logged from an attached photo must carry a photo assessment, scored like photo extraction', async () => {
    const factor = (score: number) => ({ score, reason: 'Two fried pastries on a plate' });
    const photoAssessment = {
      imageKind: 'meal',
      productNameVisible: false,
      descriptionStatesAmount: true,
      confidenceFactors: { foodIdentity: factor(85), portionSize: factor(80), nutrientValues: factor(55), imageQuality: factor(90) },
      notes: 'Assumed deep-fried samosas of standard size.',
    };
    const model = scriptedModel([modelCall('logMeal', EGGS_MEAL), modelCall('logMeal', { ...EGGS_MEAL, photoAssessment })]);

    const result = await runChatTurn({
      history: [], message: 'log these 2 for breakfast',
      context: { userId: userA.id, today: TODAY, attachedPhoto: { hasCaption: true } },
      generateTurn: model.generateTurn,
    });

    const refusal = model.requests[1].contents.at(-1)?.parts[0].functionResponse?.response.error;
    assert.match(String(refusal), /photoAssessment: required/);
    const analysis = result.pendingAction?.photoAnalysis;
    assert.equal(analysis?.imageKind, 'meal');
    assert.equal(analysis?.notes, 'Assumed deep-fried samosas of standard size.');
    assert.ok(analysis && analysis.confidence.score > 0 && analysis.confidence.score <= 95);
    assert.equal(analysis?.confidence.factors.length, 4);
    assert.equal(result.pendingAction?.args.extractionAnalysis, undefined, 'never part of the echoed args');
  });

  test('a nutrition question becomes a resolved estimate, never a pending confirmation', async () => {
    const model = scriptedModel([modelCall('estimateNutrition', { items: EGGS_MEAL.items })]);

    const result = await runChatTurn({
      history: [], message: 'how many calories in 2 eggs?', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.equal(result.pendingAction?.tool, 'estimateNutrition');
    assert.match(result.reply, /Estimated nutrition: Egg x2: 156 kcal/);
    assert.deepEqual((result.pendingAction?.args.items as { macros: unknown }[])[0].macros, {
      proteinG: 12.6, carbG: 1.2, fatG: 10.6,
    });
    assert.equal(await FoodEntry.countDocuments({}), 0);
  });

  test('invalid write arguments go back to the model, which can correct them', async () => {
    const model = scriptedModel([
      modelCall('logMeal', { ...EGGS_MEAL, mealType: 'brunch' }),
      modelCall('logMeal', EGGS_MEAL),
    ]);

    const result = await runChatTurn({
      history: [], message: 'eggs', context: { userId: userA.id, today: TODAY }, generateTurn: model.generateTurn,
    });

    const errorResponse = model.requests[1].contents.at(-1)?.parts[0].functionResponse?.response;
    assert.match(String(errorResponse?.error), /mealType/);
    assert.equal(result.pendingAction?.tool, 'logMeal');
  });

  test('a partial goal change is checked against the saved goal but carries only what changes', async () => {
    await server.request(userA, 'POST', '/api/goals', {
      dailyCalorieTarget: 2000, proteinTargetG: 120, carbTargetG: 220, fatTargetG: 70, weightGoalKg: 72,
    });
    const model = scriptedModel([modelCall('setGoal', { proteinTargetG: 150 })]);

    const result = await runChatTurn({
      history: [], message: 'set protein to 150', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.deepEqual(result.pendingAction?.args, { proteinTargetG: 150 });
    assert.equal(result.reply, 'Update daily goal: protein 120 g to 150 g');
    assert.equal((await Goal.findOne({ userId: userA.id }))?.proteinTargetG, 120);
  });

  test('a model that never stops calling tools hits the iteration cap', async () => {
    const model = scriptedModel(Array.from({ length: MAX_AGENT_ITERATIONS + 1 }, () => modelCall('getGoal')));

    await assert.rejects(
      runChatTurn({
        history: [], message: 'loop', context: { userId: userA.id, today: TODAY }, generateTurn: model.generateTurn,
      }),
      (error: unknown) => error instanceof AppError && error.code === 'CHAT_STEP_LIMIT'
    );
    assert.equal(model.requests.length, MAX_AGENT_ITERATIONS);
  });
});

describe('POST /api/chat', () => {
  test('rejects an empty or missing message', async () => {
    assert.equal((await server.request(userA, 'POST', '/api/chat', { message: '   ' })).status, 400);
    assert.equal((await server.request(userA, 'POST', '/api/chat', { text: 'hi' })).status, 400);
    assert.equal((await server.request(null, 'POST', '/api/chat', { message: 'hi' })).status, 401);
  });

  test('an unavailable provider returns 503 and keeps the message with its failure, for a retry', async () => {
    const result = await server.request(userA, 'POST', '/api/chat', { message: 'how am I doing?' });

    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'AI_UNAVAILABLE');
    const stored = await ChatMessage.findOne({ userId: userA.id });
    assert.equal(stored?.content, 'how am I doing?');
    assert.equal(stored?.replyError?.code, 'AI_UNAVAILABLE');
    assert.equal(result.body.details.userMessage._id, stored?._id.toString());
  });
});

describe('POST /api/chat/messages/:messageId/retry', () => {
  function failedMessage(user: TestUser, content: string) {
    return ChatMessage.create({
      userId: user.id, role: 'user', content, replyError: { message: 'unavailable', code: 'AI_UNAVAILABLE' },
    });
  }

  test('runs the same message again and records the new failure on it, without a duplicate', async () => {
    const message = await failedMessage(userA, 'how am I doing?');

    const result = await server.request(userA, 'POST', `/api/chat/messages/${message._id}/retry`, {});

    assert.equal(result.status, 503);
    assert.equal(result.body.details.userMessage._id, message._id.toString());
    assert.equal(await ChatMessage.countDocuments({ userId: userA.id }), 1);
    assert.equal((await ChatMessage.findById(message._id))?.replyError?.code, 'AI_UNAVAILABLE');
  });

  test('refuses a message that is not the latest', async () => {
    const older = await failedMessage(userA, 'first');
    await ChatMessage.create({ userId: userA.id, role: 'user', content: 'second' });

    const result = await server.request(userA, 'POST', `/api/chat/messages/${older._id}/retry`, {});

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'MESSAGE_NOT_LATEST');
  });

  test('refuses a message whose reply is still in flight', async () => {
    const inFlight = await ChatMessage.create({ userId: userA.id, role: 'user', content: 'hi', replyRequestedAt: new Date() });

    const result = await server.request(userA, 'POST', `/api/chat/messages/${inFlight._id}/retry`, {});

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'REPLY_IN_PROGRESS');
  });

  test("cannot retry another user's message", async () => {
    const message = await failedMessage(userB, 'mine');

    const result = await server.request(userA, 'POST', `/api/chat/messages/${message._id}/retry`, {});

    assert.equal(result.status, 404);
    assert.ok((await ChatMessage.findById(message._id))?.replyError);
  });
});

describe('POST /api/chat/confirm-action', () => {
  const pendingMeal = {
    mealType: 'breakfast',
    date: TODAY,
    items: [{ name: 'Egg', unit: 'count', quantity: 2, calories: 156, macros: { proteinG: 12.6, carbG: 1.2, fatG: 10.6 } }],
  };

  async function proposeAction(user: TestUser, tool: 'logMeal' | 'setGoal'): Promise<string> {
    const proposal = await ChatMessage.create({
      userId: user.id, role: 'assistant', content: 'Log breakfast for today: Egg x2', action: { tool, status: 'pending' },
    });
    return proposal._id.toString();
  }

  test('logs the meal as an ai-chat entry and marks the proposal confirmed, without a second message', async () => {
    const messageId = await proposeAction(userA, 'logMeal');

    const result = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId, tool: 'logMeal', args: { ...pendingMeal, source: 'manual' },
    });

    assert.equal(result.status, 201);
    const entry = await FoodEntry.findById(result.body.data.foodEntry._id);
    assert.equal(entry?.userId.toString(), userA.id);
    assert.equal(entry?.source, 'ai-chat');
    assert.equal(entry?.calories, 156);
    assert.equal(result.body.data.message._id, messageId);
    assert.equal(result.body.data.message.action.status, 'confirmed');
    assert.equal(await ChatMessage.countDocuments({ userId: userA.id }), 1);
  });

  test('a second confirm of the same proposal is refused and logs nothing more', async () => {
    const messageId = await proposeAction(userA, 'logMeal');
    const body = { messageId, tool: 'logMeal', args: pendingMeal };

    const [first, second] = await Promise.all([
      server.request(userA, 'POST', '/api/chat/confirm-action', body),
      server.request(userA, 'POST', '/api/chat/confirm-action', body),
    ]);

    assert.deepEqual([first.status, second.status].sort(), [201, 409]);
    assert.equal(await FoodEntry.countDocuments({}), 1);
  });

  test('re-validates tampered args, saves nothing and leaves the proposal pending', async () => {
    const messageId = await proposeAction(userA, 'logMeal');

    const result = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId, tool: 'logMeal', args: { ...pendingMeal, items: [{ ...pendingMeal.items[0], calories: -50 }] },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'INVALID_CHAT_ACTION');
    assert.equal(await FoodEntry.countDocuments({}), 0);
    assert.equal((await ChatMessage.findById(messageId))?.action?.status, 'pending');
  });

  test('ignores a photo or confidence the client adds to the echoed args', async () => {
    const messageId = await proposeAction(userA, 'logMeal');

    const result = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId, tool: 'logMeal',
      args: { ...pendingMeal, imageUrl: 'https://example.com/other.jpg', confidenceScore: 95, confidenceLevel: 'high' },
    });

    assert.equal(result.status, 201);
    const entry = await FoodEntry.findById(result.body.data.foodEntry._id);
    assert.equal(entry?.imageUrl, undefined);
    assert.equal(entry?.confidenceScore, undefined);
  });

  test("cannot confirm another user's proposal", async () => {
    const messageId = await proposeAction(userB, 'logMeal');

    const result = await server.request(userA, 'POST', '/api/chat/confirm-action', { messageId, tool: 'logMeal', args: pendingMeal });

    assert.equal(result.status, 404);
    assert.equal(await FoodEntry.countDocuments({}), 0);
    assert.equal((await ChatMessage.findById(messageId))?.action?.status, 'pending');
  });

  test('rejects a tool that is not a write tool, or a missing message id', async () => {
    const messageId = await proposeAction(userA, 'logMeal');
    assert.equal((await server.request(userA, 'POST', '/api/chat/confirm-action', { messageId, tool: 'deleteEverything', args: {} })).status, 400);
    assert.equal((await server.request(userA, 'POST', '/api/chat/confirm-action', { tool: 'logMeal', args: pendingMeal })).status, 400);
  });

  test('saves a confirmed goal', async () => {
    const messageId = await proposeAction(userA, 'setGoal');

    const result = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId, tool: 'setGoal', args: { dailyCalorieTarget: 1900, proteinTargetG: 130, carbTargetG: 200, fatTargetG: 60 },
    });

    assert.equal(result.status, 201);
    assert.equal((await Goal.findOne({ userId: userA.id }))?.dailyCalorieTarget, 1900);
  });
});

describe('POST /api/chat/cancel-action', () => {
  async function proposeMeal(user: TestUser, status: 'pending' | 'confirmed' = 'pending'): Promise<string> {
    const proposal = await ChatMessage.create({
      userId: user.id, role: 'assistant', content: 'Log breakfast for today: Egg x2', action: { tool: 'logMeal', status },
    });
    return proposal._id.toString();
  }

  test('marks a pending proposal cancelled, so it cannot be confirmed afterwards', async () => {
    const messageId = await proposeMeal(userA);

    const result = await server.request(userA, 'POST', '/api/chat/cancel-action', { messageId });

    assert.equal(result.status, 200);
    assert.equal(result.body.data.action.status, 'cancelled');
    const confirm = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId,
      tool: 'logMeal',
      args: {
        mealType: 'breakfast',
        date: TODAY,
        items: [{ name: 'Egg', unit: 'count', quantity: 2, calories: 156, macros: { proteinG: 12.6, carbG: 1.2, fatG: 10.6 } }],
      },
    });
    assert.equal(confirm.status, 409);
    assert.equal(confirm.body.code, 'ACTION_ALREADY_CANCELLED');
    assert.equal(await FoodEntry.countDocuments({}), 0);
  });

  test('refuses to cancel a change that was already saved', async () => {
    const messageId = await proposeMeal(userA, 'confirmed');

    const result = await server.request(userA, 'POST', '/api/chat/cancel-action', { messageId });

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'ACTION_ALREADY_CONFIRMED');
    assert.equal((await ChatMessage.findById(messageId))?.action?.status, 'confirmed');
  });

  test("cannot cancel another user's proposal", async () => {
    const messageId = await proposeMeal(userB);

    const result = await server.request(userA, 'POST', '/api/chat/cancel-action', { messageId });

    assert.equal(result.status, 404);
    assert.equal((await ChatMessage.findById(messageId))?.action?.status, 'pending');
  });
});

describe('GET /api/chat/history', () => {
  test('pages newest first in the standard envelope, scoped to the caller', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await ChatMessage.create({ userId: userA.id, role: index % 2 ? 'user' : 'assistant', content: `A ${index}` });
    }
    await ChatMessage.create({ userId: userB.id, role: 'user', content: 'B secret' });

    const firstPage = await server.request(userA, 'GET', '/api/chat/history?page=1&limit=2');
    const lastPage = await server.request(userA, 'GET', '/api/chat/history?page=3&limit=2');
    const otherUser = await server.request(userB, 'GET', '/api/chat/history');

    assert.equal(firstPage.status, 200);
    assert.deepEqual(firstPage.body.data.map((message: { content: string }) => message.content), ['A 5', 'A 4']);
    assert.equal(firstPage.body.total, 5);
    assert.equal(firstPage.body.totalPages, 3);
    assert.deepEqual(lastPage.body.data.map((message: { content: string }) => message.content), ['A 1']);
    assert.equal(otherUser.body.total, 1);
    assert.ok(!JSON.stringify(otherUser.body).includes('A 1'));
  });
});

describe('DELETE /api/chat/messages/:messageId', () => {
  test('hides a message from history and from what the model is shown, without touching what it did', async () => {
    const logged = await ChatMessage.create({
      userId: userA.id, role: 'assistant', content: 'Log breakfast for today: Egg x2',
      action: { tool: 'logMeal', status: 'confirmed', args: EGGS_MEAL },
    });
    const entry = await FoodEntry.create({
      userId: userA.id, mealType: 'breakfast', name: 'Egg', date: TODAY, source: 'ai-chat',
      items: [{ name: 'Egg', unit: 'count', quantity: 2, calories: 156, macros: { proteinG: 12.6, carbG: 1.2, fatG: 10.6 } }],
      calories: 156, macros: { proteinG: 12.6, carbG: 1.2, fatG: 10.6 },
    });

    const result = await server.request(userA, 'DELETE', `/api/chat/messages/${logged._id}`);

    assert.equal(result.status, 200);
    assert.ok((await ChatMessage.findById(logged._id))?.deletedAt);
    assert.equal((await server.request(userA, 'GET', '/api/chat/history')).body.total, 0);
    assert.ok(await FoodEntry.exists({ _id: entry._id }), 'the logged meal is untouched');
  });

  test('cannot delete another user\'s message, and a missing one 404s', async () => {
    const theirs = await ChatMessage.create({ userId: userB.id, role: 'user', content: 'mine' });

    assert.equal((await server.request(userA, 'DELETE', `/api/chat/messages/${theirs._id}`)).status, 404);
    assert.equal((await server.request(userA, 'DELETE', '/api/chat/messages/000000000000000000000000')).status, 404);
    assert.ok(!(await ChatMessage.findById(theirs._id))?.deletedAt);
  });

  test('deleting twice, or restoring what was never deleted, 404s', async () => {
    const message = await ChatMessage.create({ userId: userA.id, role: 'user', content: 'hi' });

    assert.equal((await server.request(userA, 'POST', `/api/chat/messages/${message._id}/restore`)).status, 404);
    assert.equal((await server.request(userA, 'DELETE', `/api/chat/messages/${message._id}`)).status, 200);
    assert.equal((await server.request(userA, 'DELETE', `/api/chat/messages/${message._id}`)).status, 404);
  });

  test('deleting a message with a picture attached marks it deleted and cleans up', async () => {
    const message = await ChatMessage.create({
      userId: userA.id,
      role: 'user',
      content: 'photo caption',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v12345/intake/chat/userA/photo123.jpg',
      imagePublicId: 'intake/chat/userA/photo123',
    });

    const result = await server.request(userA, 'DELETE', `/api/chat/messages/${message._id}`);
    assert.equal(result.status, 200);
    const updated = await ChatMessage.findById(message._id);
    assert.ok(updated?.deletedAt);
  });
});

describe('extractPublicIdFromUrl', () => {
  test('extracts public ID from standard and transformed Cloudinary URLs', () => {
    assert.equal(
      extractPublicIdFromUrl('https://res.cloudinary.com/cloud/image/upload/v12345/intake/chat/user/pic.jpg'),
      'intake/chat/user/pic'
    );
    assert.equal(
      extractPublicIdFromUrl('https://res.cloudinary.com/cloud/image/upload/intake/chat/user/pic.jpg'),
      'intake/chat/user/pic'
    );
    assert.equal(
      extractPublicIdFromUrl('https://not-cloudinary.com/some/image.png'),
      undefined
    );
  });
});

describe('POST /api/chat/messages/:messageId/restore', () => {
  test('undoes a delete, bringing the message back into history', async () => {
    const message = await ChatMessage.create({ userId: userA.id, role: 'user', content: 'hi' });
    await server.request(userA, 'DELETE', `/api/chat/messages/${message._id}`);

    const result = await server.request(userA, 'POST', `/api/chat/messages/${message._id}/restore`);

    assert.equal(result.status, 200);
    assert.equal((await ChatMessage.findById(message._id))?.deletedAt, undefined);
    assert.equal((await server.request(userA, 'GET', '/api/chat/history')).body.total, 1);
  });
});

