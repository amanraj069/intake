import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { ChatMessage } from '../src/models/ChatMessage';
import { FoodEntry } from '../src/models/FoodEntry';
import { MealCatalogDish } from '../src/models/MealCatalogDish';
import { MealCatalogItem } from '../src/models/MealCatalogItem';
import { parseMealLogRequest } from '../src/lib/mealLogRequest';
import { today } from '../src/lib/calendarDay';
import { runChatTurn } from '../src/services/chatAgent';
import { GeminiContent } from '../src/lib/gemini/geminiConversation';
import { StoredCatalogueSynonyms } from '../src/models/ChatMessage';

/**
 * No Gemini keys are configured, so any message that reaches the model fails
 * with AI_UNAVAILABLE. A 200 reply is therefore proof the catalogue answered
 * without a model call.
 */

for (const name of Object.keys(process.env)) {
  if (/^GEMINI_KEY\d+$/.test(name)) delete process.env[name];
}

// The server only trusts a client's local time alongside a day close to its own.
const TODAY = today();

let server: TestServer;
let userA: TestUser;
let userB: TestUser;

const ROTI_SABJI = {
  mealType: 'lunch',
  name: 'Roti sabji',
  date: TODAY,
  items: [
    { name: 'Roti', unit: 'count', quantity: 2, calories: 240, macros: { proteinG: 8, carbG: 44, fatG: 4 } },
    { name: 'Paneer sabji', unit: 'g', quantity: 150, calories: 300, macros: { proteinG: 14, carbG: 10, fatG: 22 } },
  ],
};

function sendChat(user: TestUser, message: string, localTime?: string) {
  return server.request(user, 'POST', '/api/chat', { message, today: TODAY, localTime });
}

before(async () => {
  server = await startTestServer();
  userA = await createTestUser('catalog-a');
  userB = await createTestUser('catalog-b');
});

after(async () => {
  await server.close();
});

beforeEach(async () => {
  await Promise.all([ChatMessage.deleteMany({}), FoodEntry.deleteMany({}), MealCatalogItem.deleteMany({}), MealCatalogDish.deleteMany({})]);
  await server.request(userA, 'POST', '/api/food-entries', ROTI_SABJI);
});

describe('reading a log request', () => {
  test('finds the foods, amounts, meal and day', () => {
    assert.deepEqual(parseMealLogRequest('I had 2 rotis and dal 200g for dinner yesterday'), {
      mealType: 'dinner',
      daysAgo: 1,
      wholeKey: undefined,
      foods: [
        { key: 'roti', amount: { quantity: 2, unit: 'count' } },
        { key: 'dal', amount: { quantity: 200, unit: 'g' } },
      ],
    });
  });

  test('keeps the whole phrase for a dish named with "and"', () => {
    assert.equal(parseMealLogRequest('log dal and rice for lunch')?.wholeKey, 'dal and rice');
  });

  test('leaves questions, other days, several meals and bare follow-ups to the model', () => {
    for (const message of [
      'how many calories in roti sabji?',
      'what should I eat for dinner',
      'had roti on monday for lunch',
      'eggs for breakfast and roti for lunch',
      'log lunch',
      'roti sabji',
      'roti mein kitni calorie hai',
      'kal raat chawal khaya',
    ]) {
      assert.equal(parseMealLogRequest(message), null, message);
    }
  });
});

describe('reading a Hindi or Hinglish log request', () => {
  test('reads Hinglish meal words, postpositions, numbers and "aur"', () => {
    assert.deepEqual(parseMealLogRequest('maine nashte mein do anda aur chai li'), {
      mealType: 'breakfast',
      daysAgo: 0,
      wholeKey: undefined,
      foods: [{ key: 'anda', amount: { quantity: 2, unit: 'count' } }, { key: 'chai', amount: undefined }],
    });
  });

  test('keeps Devanagari food names whole, vowel signs included', () => {
    const request = parseMealLogRequest('मैंने लंच में रोटी और दाल खाई');

    assert.equal(request?.mealType, 'lunch');
    assert.deepEqual(request?.foods, [
      { key: 'रोटी', amount: undefined },
      { key: 'दाल', amount: undefined },
    ]);
  });
});

/** Stores a logMeal proposal carrying synonyms, as the model's tool call would, and confirms it. */
async function confirmMealWithSynonyms(
  user: TestUser,
  meal: Record<string, unknown>,
  catalogueSynonyms: StoredCatalogueSynonyms
) {
  const proposal = await ChatMessage.create({
    userId: user.id,
    role: 'assistant',
    content: 'Log lunch',
    action: { tool: 'logMeal', status: 'pending', args: meal, catalogueSynonyms },
  });
  return server.request(user, 'POST', '/api/chat/confirm-action', {
    messageId: proposal._id.toString(),
    tool: 'logMeal',
    args: meal,
  });
}

const RICE = { name: 'Rice', unit: 'g', quantity: 150, calories: 195, macros: { proteinG: 4, carbG: 42, fatG: 0.5 } };
const DAL = { name: 'Dal', unit: 'g', quantity: 200, calories: 230, macros: { proteinG: 14, carbG: 30, fatG: 6 } };

describe('synonyms from the model', () => {
  test('the logMeal tool call carries its synonyms beside the args, never inside them', async () => {
    const turns: GeminiContent[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'logMeal',
              args: {
                mealType: 'lunch',
                items: [{ ...RICE, ...RICE.macros, macros: undefined, synonyms: ['chawal', ' चावल ', 42, 'chawal'] }],
              },
            },
          },
        ],
      },
    ];

    const result = await runChatTurn({
      history: [],
      message: 'log 150 g rice for lunch',
      context: { userId: userA.id, today: TODAY },
      generateTurn: async () => turns.shift()!,
    });

    assert.deepEqual(result.pendingAction?.catalogueSynonyms, {
      dish: [],
      items: [{ name: 'Rice', unit: 'g', synonyms: ['chawal', 'चावल'] }],
    });
    assert.equal('synonyms' in (result.pendingAction?.args.items as object[])[0], false);
  });

  test('a confirmed meal teaches the catalogue its Hindi names, matched later without a model call', async () => {
    const confirmed = await confirmMealWithSynonyms(
      userA,
      { mealType: 'lunch', date: TODAY, name: 'Dal rice', items: [DAL, RICE] },
      {
        dish: ['dal chawal', 'दाल चावल'],
        items: [
          { name: 'Rice', unit: 'g', synonyms: ['chawal', 'चावल'] },
          { name: 'Dal', unit: 'g', synonyms: ['दाल'] },
        ],
      }
    );
    assert.equal(confirmed.status, 201);

    const hinglish = await sendChat(userA, 'maine lunch mein chawal khaya');
    const devanagari = await sendChat(userA, 'मैंने डिनर में दाल खाई');
    const dish = await sendChat(userA, 'dinner mein dal chawal');

    assert.equal(hinglish.body.data.pendingAction.args.items[0].name, 'Rice');
    assert.equal(devanagari.body.data.pendingAction.args.items[0].name, 'Dal');
    assert.equal(dish.body.data.pendingAction.args.name, 'Dal rice');
    assert.equal(dish.body.data.pendingAction.args.items.length, 2);
  });

  test('a synonym shared by two different foods is left to the model', async () => {
    for (const name of ['Toor dal', 'Moong dal']) {
      await confirmMealWithSynonyms(
        userA,
        { mealType: 'lunch', date: TODAY, items: [{ ...DAL, name }] },
        { dish: [], items: [{ name, unit: 'g', synonyms: ['dal'] }] }
      );
    }

    const result = await sendChat(userA, 'had dal for lunch');

    assert.equal(result.body.code, 'AI_UNAVAILABLE');
  });
});

describe('POST /api/chat from the meal catalogue', () => {
  test('saving a meal stores each item once and a dish linking them at its own quantities', async () => {
    const items = await MealCatalogItem.find({ userId: userA.id }).sort({ key: 1 }).lean();
    const [dish] = await MealCatalogDish.find({ userId: userA.id }).lean();

    assert.deepEqual(items.map(({ key, unit, quantity }) => [key, unit, quantity]), [
      ['paneer sabji', 'g', 150],
      ['roti', 'count', 2],
    ]);
    assert.equal(dish.key, 'roti sabji');
    assert.deepEqual(
      dish.components.map(({ item, quantity }) => [item.toString(), quantity]),
      [
        [items[1]._id.toString(), 2],
        [items[0]._id.toString(), 150],
      ]
    );
  });

  test('proposes a logged dish again without a model call, and confirming saves it', async () => {
    const result = await sendChat(userA, 'had roti sabji for lunch');

    assert.equal(result.status, 200);
    const { pendingAction, assistantMessage } = result.body.data;
    assert.equal(pendingAction.tool, 'logMeal');
    assert.equal(pendingAction.args.name, 'Roti sabji');
    assert.equal(pendingAction.args.items.length, 2);
    assert.match(pendingAction.preview, /^From your saved meals: Log lunch for today/);
    assert.equal(assistantMessage.action.status, 'pending');

    const confirmed = await server.request(userA, 'POST', '/api/chat/confirm-action', {
      messageId: assistantMessage._id, tool: 'logMeal', args: pendingAction.args,
    });
    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.data.foodEntry.calories, 540);
  });

  test('scales one item of a logged dish to the amount asked for', async () => {
    const result = await sendChat(userA, 'log 3 rotis for dinner');

    assert.equal(result.status, 200);
    const [roti] = result.body.data.pendingAction.args.items;
    assert.equal(roti.quantity, 3);
    assert.equal(roti.calories, 360);
    assert.equal(roti.macros.carbG, 66);
    assert.equal(result.body.data.pendingAction.args.mealType, 'dinner');
  });

  test('picks the meal from the local time when none is named', async () => {
    const result = await sendChat(userA, 'log paneer sabji', '08:30');

    assert.equal(result.status, 200);
    assert.equal(result.body.data.pendingAction.args.mealType, 'breakfast');
  });

  test('asks the model when any food is new, the unit differs or the meal is unknown', async () => {
    for (const [message, localTime] of [
      ['had roti and chicken curry for lunch', undefined],
      ['log 100 g roti for lunch', undefined],
      ['log roti sabji', undefined],
      ['log roti sabji but with less oil for lunch', undefined],
    ] as const) {
      const result = await sendChat(userA, message, localTime);
      assert.equal(result.body.code, 'AI_UNAVAILABLE', message);
    }
  });

  test("never proposes from another user's catalogue", async () => {
    const result = await sendChat(userB, 'had roti sabji for lunch');

    assert.equal(result.body.code, 'AI_UNAVAILABLE');
  });

  test('an edited portion replaces the one the catalogue offers', async () => {
    const [entry] = await FoodEntry.find({ userId: userA.id }).lean();
    await server.request(userA, 'PATCH', `/api/food-entries/${entry._id}`, {
      items: [{ name: 'Roti', unit: 'count', quantity: 1, calories: 100, macros: { proteinG: 3, carbG: 20, fatG: 1 } }],
    });

    const result = await sendChat(userA, 'had roti for lunch');

    assert.equal(result.body.data.pendingAction.args.items[0].calories, 100);
  });

  test('correcting a food corrects every dish linked to it', async () => {
    await server.request(userA, 'POST', '/api/food-entries', {
      mealType: 'dinner',
      date: TODAY,
      items: [{ name: 'Roti', unit: 'count', quantity: 1, calories: 100, macros: { proteinG: 3, carbG: 20, fatG: 1 } }],
    });

    const result = await sendChat(userA, 'had roti sabji for lunch');

    const [roti, sabji] = result.body.data.pendingAction.args.items;
    assert.deepEqual([roti.quantity, roti.calories, sabji.calories], [2, 200, 300]);
  });

  test('the same food logged in another unit is a separate item and leaves the dish intact', async () => {
    await server.request(userA, 'POST', '/api/food-entries', {
      mealType: 'dinner',
      date: TODAY,
      items: [{ name: 'Roti', unit: 'g', quantity: 80, calories: 220, macros: { proteinG: 7, carbG: 42, fatG: 3 } }],
    });

    const dish = await sendChat(userA, 'had roti sabji for lunch');
    const weighed = await sendChat(userA, 'had 120 g roti for lunch');
    const counted = await sendChat(userA, 'had 1 roti for lunch');

    assert.equal(dish.body.data.pendingAction.args.items[0].calories, 240);
    assert.equal(weighed.body.data.pendingAction.args.items[0].calories, 330);
    assert.equal(counted.body.data.pendingAction.args.items[0].calories, 120);
    assert.equal(await MealCatalogItem.countDocuments({ userId: userA.id, key: 'roti' }), 2);
  });

  test('matches a dish for one food and a saved item for another in the same message', async () => {
    await server.request(userA, 'POST', '/api/food-entries', {
      mealType: 'lunch',
      date: TODAY,
      items: [{ name: 'Curd', unit: 'g', quantity: 100, calories: 60, macros: { proteinG: 3, carbG: 5, fatG: 3 } }],
    });

    const result = await sendChat(userA, 'had roti sabji and curd for lunch');

    assert.deepEqual(
      result.body.data.pendingAction.args.items.map((item: { name: string }) => item.name),
      ['Roti', 'Paneer sabji', 'Curd']
    );
  });

  test('rescales an item to the count asked for, whatever portion was logged', async () => {
    await server.request(userA, 'POST', '/api/food-entries', {
      mealType: 'dinner',
      date: TODAY,
      items: [
        {
          name: 'Roti', unit: 'count', quantity: 3, calories: 360,
          macros: { proteinG: 9, carbG: 66, fatG: 6 }, micros: { iron: { amount: 3, unit: 'mg' } },
        },
      ],
    });

    const result = await sendChat(userA, 'log 1 roti for lunch');

    const [roti] = result.body.data.pendingAction.args.items;
    assert.deepEqual([roti.quantity, roti.calories, roti.macros.carbG, roti.micros.iron.amount], [1, 120, 22, 1]);
  });

  test('a count in front of a saved dish scales every one of its foods', async () => {
    const half = await sendChat(userA, 'log half roti sabji for dinner');
    const double = await sendChat(userA, 'log 2 roti sabji for dinner');

    const quantities = (result: typeof half) =>
      result.body.data.pendingAction.args.items.map((item: { quantity: number; calories: number }) => [
        item.quantity,
        item.calories,
      ]);
    assert.deepEqual(quantities(half), [[1, 120], [75, 150]]);
    assert.deepEqual(quantities(double), [[4, 480], [300, 600]]);
    assert.equal(double.body.data.pendingAction.args.name, 'Roti sabji');
  });
});
