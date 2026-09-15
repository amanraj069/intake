import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { ChatMessage } from '../src/models/ChatMessage';
import { ConversationTurnGenerator, ConversationTurnRequest, GeminiContent } from '../src/lib/gemini/geminiConversation';
import { runChatTurn } from '../src/services/chatAgent';

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
  return { role: 'model', parts: [{ functionCall: { name, args }, thoughtSignature: 'sig' }] };
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
  user = await createTestUser('stream-test');
});

after(async () => {
  await server.close();
});

beforeEach(async () => {
  await ChatMessage.deleteMany({});
});

describe('Chat Streaming Unit Tests', () => {
  test('runChatTurn dispatches onTextDelta chunks during turn generation', async () => {
    const textDeltas: string[] = [];
    const statuses: string[] = [];

    const generateTurn: ConversationTurnGenerator = async (_request, options) => {
      options?.onTextDelta?.('Hello');
      options?.onTextDelta?.(' ');
      options?.onTextDelta?.('world!');
      return modelText('Hello world!');
    };

    const result = await runChatTurn({
      history: [],
      message: 'hi',
      context: { userId: user.id, today: TODAY },
      generateTurn,
      callbacks: {
        onTextDelta: (delta) => textDeltas.push(delta),
        onStatus: (status) => statuses.push(status),
      },
    });

    assert.equal(result.reply, 'Hello world!');
    assert.deepEqual(textDeltas, ['Hello', ' ', 'world!']);
  });

  test('runChatTurn dispatches onStatus when executing read tools', async () => {
    const statuses: string[] = [];
    const { generateTurn } = scriptedModel([
      modelCall('getTodaySummary', { date: TODAY }),
      modelText('You have eaten 0 calories today.'),
    ]);

    const result = await runChatTurn({
      history: [],
      message: 'calories today?',
      context: { userId: user.id, today: TODAY },
      generateTurn,
      callbacks: {
        onStatus: (status) => statuses.push(status),
      },
    });

    assert.equal(result.reply, 'You have eaten 0 calories today.');
    assert.deepEqual(statuses, ["Looking up today's intake..."]);
  });
});

describe('Chat SSE HTTP Endpoint', () => {
  test('serves SSE headers and delivers error event when Gemini keys are missing', async () => {
    const res = await fetch(`${server.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Cookie: `access_token=${user.accessToken}`,
      },
      body: JSON.stringify({ message: 'Hello assistant', today: TODAY }),
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));

    const text = await res.text();
    assert.ok(text.includes('event: error'));
    assert.ok(text.includes('AI_UNAVAILABLE'));

    // Verify user message was still recorded in database
    const stored = await ChatMessage.findOne({ userId: user.id, role: 'user' });
    assert.ok(stored);
    assert.equal(stored.content, 'Hello assistant');
    assert.equal(stored.replyError?.code, 'AI_UNAVAILABLE');
  });

  test('non-streaming client receives standard JSON response format', async () => {
    const res = await server.request(user, 'POST', '/api/chat', {
      message: 'Hello standard',
      today: TODAY,
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'AI_UNAVAILABLE');
    assert.ok(res.body.details?.userMessage);
  });

  test('retry endpoint supports SSE streaming headers and error delivery', async () => {
    const stored = await ChatMessage.create({
      userId: user.id,
      role: 'user',
      content: 'Can I retry this?',
      replyError: { message: 'Failed earlier', code: 'AI_UNAVAILABLE' },
    });

    const res = await fetch(`${server.baseUrl}/api/chat/messages/${stored._id}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Cookie: `access_token=${user.accessToken}`,
      },
      body: JSON.stringify({ today: TODAY }),
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));

    const text = await res.text();
    assert.ok(text.includes('event: error'));
    assert.ok(text.includes('AI_UNAVAILABLE'));
  });
});
