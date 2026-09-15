import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { buildChatSystemInstruction } from '../src/lib/chatPrompt';
import { ConversationTurnGenerator, ConversationTurnRequest, GeminiContent } from '../src/lib/gemini/geminiConversation';
import { GeminiRequestError } from '../src/lib/gemini/geminiErrors';
import { toAiAppError } from '../src/lib/gemini/aiFailure';
import { AppError } from '../src/middleware/errorHandler';
import { ChatMessage } from '../src/models/ChatMessage';
import { Goal } from '../src/models/Goal';
import { runChatTurn } from '../src/services/chatAgent';
import { guardToolCall, statusForCalls } from '../src/services/chat/toolDispatch';

/**
 * The failure paths and guard rails around the agent loop: how tool failures
 * are classified, what the model is told about the user's clock, and how a
 * goal proposal survives an edit made before it is confirmed.
 */

for (const name of Object.keys(process.env)) {
  if (/^GEMINI_KEY\d+$/.test(name)) delete process.env[name];
}

const TODAY = '2026-09-14';

let server: TestServer;
let user: TestUser;

function modelText(text: string): GeminiContent {
  return { role: 'model', parts: [{ text }] };
}

function modelCall(name: string, args: Record<string, unknown> = {}): GeminiContent {
  return { role: 'model', parts: [{ functionCall: { name, args } }] };
}

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

before(async () => {
  server = await startTestServer();
  user = await createTestUser('chat-safeguards');
});

after(async () => {
  await server.close();
});

beforeEach(async () => {
  await Promise.all([ChatMessage.deleteMany({}), Goal.deleteMany({})]);
});

describe('tool call failures', () => {
  test('a request-level service error goes back to the model instead of failing the turn', async () => {
    const outcome = await guardToolCall(async () => {
      throw new AppError('That meal could not be found.', 404, 'NOT_FOUND');
    }, 1000);

    assert.deepEqual(outcome, { ok: false, error: 'That meal could not be found.' });
  });

  test('an infrastructure failure fails the turn', async () => {
    const outage = new Error('connection refused');

    await assert.rejects(
      guardToolCall(async () => {
        throw outage;
      }, 1000),
      (error: unknown) => error === outage
    );
  });

  test('a tool that outlives its time limit fails the turn with CHAT_TOOL_TIMEOUT', async () => {
    await assert.rejects(
      guardToolCall(() => new Promise(() => {}), 20),
      (error: unknown) => error instanceof AppError && error.code === 'CHAT_TOOL_TIMEOUT' && error.statusCode === 504
    );
  });

  test('an unknown tool is reported back to the model with the tools that exist', async () => {
    const model = scriptedModel([modelCall('deleteEverything'), modelText('I cannot do that.')]);

    const result = await runChatTurn({
      history: [], message: 'wipe my log', context: { userId: user.id, today: TODAY }, generateTurn: model.generateTurn,
    });

    const error = String(model.requests[1].contents.at(-1)?.parts[0].functionResponse?.response.error);
    assert.match(error, /Unknown tool "deleteEverything"/);
    assert.match(error, /getGoal/);
    assert.equal(result.pendingAction, null);
  });

  test('status lines come from the tool that was called', () => {
    assert.equal(statusForCalls([{ name: 'getTodaySummary' }]), "Looking up today's intake...");
    assert.equal(statusForCalls([{ name: 'notATool' }]), 'Working on your request...');
  });

  test('every provider failure reaches the user as AI_UNAVAILABLE', () => {
    const copy = { logLabel: 'Test', unavailableMessage: 'down', rejectedMessage: 'no', rejectedCode: 'REJECTED' };

    const mapped = toAiAppError(new GeminiRequestError('rate limited everywhere', 'rate-limited', 429), copy);
    const unrelated = new Error('a bug');

    assert.ok(mapped instanceof AppError && mapped.code === 'AI_UNAVAILABLE' && mapped.statusCode === 503);
    assert.equal(toAiAppError(unrelated, copy), unrelated);
  });
});

describe("the user's clock", () => {
  test('with a local time, the prompt carries it and defaults an unnamed meal from it', () => {
    const prompt = buildChatSystemInstruction({ today: TODAY, localTime: '08:15' });

    assert.match(prompt, /the user's local time is 08:15/);
    assert.match(prompt, /pick the meal matching the user's local time/);
  });

  test('without a local time, the assistant asks which meal instead of guessing', () => {
    const prompt = buildChatSystemInstruction({ today: TODAY });

    assert.match(prompt, /ask which meal it was/);
    assert.doesNotMatch(prompt, /pick the meal matching/);
  });

  test('the local time reaches the model with the turn', async () => {
    const model = scriptedModel([modelText('Morning!')]);

    await runChatTurn({
      history: [], message: 'hi', context: { userId: user.id, today: TODAY, localTime: '07:30' },
      generateTurn: model.generateTurn,
    });

    assert.match(model.requests[0].systemInstruction, /local time is 07:30/);
  });

  test('a malformed local time is rejected before any work is done', async () => {
    const result = await server.request(user, 'POST', '/api/chat', { message: 'hi', localTime: '25:00' });

    assert.equal(result.status, 400);
    assert.equal(await ChatMessage.countDocuments({ userId: user.id }), 0);
  });
});

describe('goal proposals', () => {
  const SAVED_GOAL = { dailyCalorieTarget: 2000, proteinTargetG: 120, carbTargetG: 220, fatTargetG: 70 };

  async function proposeGoalChange(changes: Record<string, unknown>): Promise<string> {
    const model = scriptedModel([modelCall('setGoal', changes)]);
    const turn = await runChatTurn({
      history: [], message: 'change my goal', context: { userId: user.id, today: TODAY },
      generateTurn: model.generateTurn,
    });
    assert.ok(turn.pendingAction, 'the model call should produce a proposal');

    const proposal = await ChatMessage.create({
      userId: user.id, role: 'assistant', content: turn.reply,
      action: { tool: 'setGoal', status: 'pending', args: turn.pendingAction.args },
    });
    return proposal._id.toString();
  }

  async function confirmProposal(messageId: string) {
    const proposal = await ChatMessage.findById(messageId);
    return server.request(user, 'POST', '/api/chat/confirm-action', {
      messageId, tool: 'setGoal', args: proposal?.action?.args,
    });
  }

  test('confirming keeps a goal edit made on the Goals page after the proposal', async () => {
    await server.request(user, 'POST', '/api/goals', SAVED_GOAL);
    const messageId = await proposeGoalChange({ proteinTargetG: 150 });

    await server.request(user, 'POST', '/api/goals', { ...SAVED_GOAL, dailyCalorieTarget: 1800 });
    const result = await confirmProposal(messageId);

    assert.equal(result.status, 201);
    const goal = await Goal.findOne({ userId: user.id, endDate: null });
    assert.equal(goal?.proteinTargetG, 150, 'the confirmed change is applied');
    assert.equal(goal?.dailyCalorieTarget, 1800, 'the edit made in between is kept');
  });

  test('a partial change that no longer makes a complete goal is refused and stays pending', async () => {
    const messageId = (
      await ChatMessage.create({
        userId: user.id, role: 'assistant', content: 'Update daily goal: protein 120 g to 150 g',
        action: { tool: 'setGoal', status: 'pending', args: { proteinTargetG: 150 } },
      })
    )._id.toString();

    const result = await confirmProposal(messageId);

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'INVALID_CHAT_ACTION');
    assert.equal(await Goal.countDocuments({ userId: user.id }), 0);
    assert.equal((await ChatMessage.findById(messageId))?.action?.status, 'pending');
  });
});
