import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import { Goal } from '../src/models/Goal';
import * as goalService from '../src/services/goal.service';
import * as reportService from '../src/services/report.service';

/**
 * Goals are versioned by effective date rather than overwritten in place, so
 * that a target change does not rewrite history. These tests drive the
 * service layer directly wherever a specific `effectiveDate` in the past is
 * needed: the HTTP endpoint always uses today, since backdating a goal isn't
 * a feature anyone has asked for, only the versioning underneath it.
 */

let server: TestServer;
let user: TestUser;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

const targets = (overrides: Partial<Record<'dailyCalorieTarget' | 'proteinTargetG' | 'carbTargetG' | 'fatTargetG', number>> = {}) => ({
  dailyCalorieTarget: 1800,
  proteinTargetG: 120,
  carbTargetG: 200,
  fatTargetG: 60,
  ...overrides,
});

describe('goal versioning', () => {
  before(async () => {
    user = await createTestUser('goal-history');
  });

  test('editing a goal again the same day updates that version instead of stacking a new one', async () => {
    const first = await server.request(user, 'POST', '/api/goals', targets({ dailyCalorieTarget: 1800 }));
    assert.equal(first.status, 200);

    const second = await server.request(user, 'POST', '/api/goals', targets({ dailyCalorieTarget: 2000 }));
    assert.equal(second.status, 200);

    const versions = await Goal.find({ userId: user.id });
    assert.equal(versions.length, 1);
    assert.equal(versions[0].dailyCalorieTarget, 2000);
  });

  test('a later goal closes out the earlier one at the new goal\'s start date', async () => {
    const otherUser = await createTestUser('goal-history-boundary');

    await goalService.upsertGoal(otherUser.id, targets({ dailyCalorieTarget: 1800 }), '2026-09-01');
    await goalService.upsertGoal(otherUser.id, targets({ dailyCalorieTarget: 2200 }), '2026-09-10');

    const versions = await Goal.find({ userId: otherUser.id }).sort({ startDate: 1 });
    assert.equal(versions.length, 2);
    assert.equal(versions[0].startDate, '2026-09-01');
    assert.equal(versions[0].endDate, '2026-09-10');
    assert.equal(versions[0].dailyCalorieTarget, 1800);
    assert.equal(versions[1].startDate, '2026-09-10');
    assert.equal(versions[1].endDate, null);
    assert.equal(versions[1].dailyCalorieTarget, 2200);

    const current = await goalService.findGoalByUserId(otherUser.id);
    assert.equal(current?.dailyCalorieTarget, 2200);
  });

  test('reports show no target for days before the user had set a goal', async () => {
    const newUser = await createTestUser('goal-history-no-goal-yet');
    await goalService.upsertGoal(newUser.id, targets(), '2026-09-10');

    const comparison = await reportService.getGoalComparison(newUser.id, '2026-09-05', '2026-09-10');

    assert.deepEqual(
      comparison.map((point) => point.targetCalories),
      [null, null, null, null, null, 1800]
    );
  });

  test('reports use the target that was active on each day, across a goal change', async () => {
    const changingUser = await createTestUser('goal-history-changes-mid-range');
    await goalService.upsertGoal(changingUser.id, targets({ dailyCalorieTarget: 1800 }), '2026-09-01');
    await goalService.upsertGoal(changingUser.id, targets({ dailyCalorieTarget: 2200 }), '2026-09-10');

    const comparison = await reportService.getGoalComparison(changingUser.id, '2026-09-08', '2026-09-11');

    assert.deepEqual(
      comparison.map((point) => ({ date: point.date, targetCalories: point.targetCalories })),
      [
        { date: '2026-09-08', targetCalories: 1800 },
        { date: '2026-09-09', targetCalories: 1800 },
        { date: '2026-09-10', targetCalories: 2200 },
        { date: '2026-09-11', targetCalories: 2200 },
      ]
    );
  });

  test('the daily summary for a past day uses the goal active then, not the current one', async () => {
    const historyUser = await createTestUser('goal-history-daily-summary');
    await goalService.upsertGoal(historyUser.id, targets({ dailyCalorieTarget: 1800 }), '2026-09-01');
    await goalService.upsertGoal(historyUser.id, targets({ dailyCalorieTarget: 2200 }), '2026-09-10');

    const past = await server.request(historyUser, 'GET', '/api/food-entries/summary?date=2026-09-05');
    assert.equal(past.status, 200);
    assert.equal(past.body.data.goal.dailyCalorieTarget, 1800);

    const recent = await server.request(historyUser, 'GET', '/api/food-entries/summary?date=2026-09-15');
    assert.equal(recent.status, 200);
    assert.equal(recent.body.data.goal.dailyCalorieTarget, 2200);
  });
});
