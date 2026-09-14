import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { ChatMessage } from '../src/models/ChatMessage';
import { FoodEntry } from '../src/models/FoodEntry';
import { Goal } from '../src/models/Goal';
import { AppError } from '../src/middleware/errorHandler';
import { ConversationTurnGenerator, ConversationTurnRequest, GeminiContent } from '../src/lib/gemini/geminiConversation';
import { MAX_AGENT_ITERATIONS, runChatTurn, toConversationContents } from '../src/services/chatAgent';

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

  test('a partial goal change is merged over the saved goal', async () => {
    await server.request(userA, 'POST', '/api/goals', {
      dailyCalorieTarget: 2000, proteinTargetG: 120, carbTargetG: 220, fatTargetG: 70, weightGoalKg: 72,
    });
    const model = scriptedModel([modelCall('setGoal', { proteinTargetG: 150 })]);

    const result = await runChatTurn({
      history: [], message: 'set protein to 150', context: { userId: userA.id, today: TODAY },
      generateTurn: model.generateTurn,
    });

    assert.deepEqual(result.pendingAction?.args, {
      dailyCalorieTarget: 2000, proteinTargetG: 150, carbTargetG: 220, fatTargetG: 70, weightGoalKg: 72,
    });
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

  test('an unavailable provider returns 503 and leaves no unanswered message behind', async () => {
    const result = await server.request(userA, 'POST', '/api/chat', { message: 'how am I doing?' });

    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'AI_UNAVAILABLE');
    assert.equal(await ChatMessage.countDocuments({ userId: userA.id }), 0);
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
