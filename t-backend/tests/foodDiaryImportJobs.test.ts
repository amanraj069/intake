import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { TestServer, TestUser, createTestUser, startTestServer } from './support/testServer';
import {
  FoodDiaryImportJobData,
  ImportJobView,
  decodeImportJobFailure,
  encodeImportJobFailure,
  toImportJobFailure,
} from '../src/lib/foodDiaryImportJob';
import { AppError } from '../src/middleware/errorHandler';
import { ImportJobProcessor } from '../src/queues/importJobProcessor';
import { MemoryImportJobs } from '../src/queues/memoryImportJobs';
import type { FoodDiaryPreview } from '../src/services/foodDiaryPreview.service';

/**
 * The import job contract: the in-memory queue (which the suite runs on, as
 * it has no Redis) with a stand-in processor, so no test reaches the AI.
 */

const PREVIEW: FoodDiaryPreview = { pageCount: 1, rows: [], warnings: [] };
const OWNER_ID = 'owner';

function jobData(userId = OWNER_ID): FoodDiaryImportJobData {
  return { userId, diaryText: '--- Page 1 ---\nBreakfast oats 310', pageCount: 1 };
}

function aiUnavailable(): AppError {
  return new AppError('PDF import is unavailable right now.', 503, 'AI_UNAVAILABLE');
}

function notADiary(): AppError {
  return new AppError('This PDF is a bank statement.', 422, 'NOT_A_FOOD_DIARY');
}

function createJobs(process: ImportJobProcessor, concurrency = 2): MemoryImportJobs {
  return new MemoryImportJobs({ process, concurrency, retryDelayMs: () => 1 });
}

/** Polls like the client does, until the job finishes or the test would hang. */
async function waitForFinish(jobs: MemoryImportJobs, jobId: string, userId = OWNER_ID): Promise<ImportJobView> {
  for (let tick = 0; tick < 200; tick += 1) {
    const view = jobs.find(jobId, userId);
    if (view && (view.state === 'completed' || view.state === 'failed')) return view;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Job ${jobId} did not finish`);
}

describe('in-memory import jobs', () => {
  test('runs the job through each stage and returns the preview', async () => {
    const stagesSeen: string[] = [];
    const jobs = createJobs(async (_data, reportStage) => {
      for (const stage of ['reading', 'splitting', 'filling'] as const) {
        await reportStage(stage);
        stagesSeen.push(stage);
      }
      return PREVIEW;
    });

    const jobId = jobs.enqueue(jobData());
    const view = await waitForFinish(jobs, jobId);

    assert.deepEqual(stagesSeen, ['reading', 'splitting', 'filling']);
    assert.equal(view.state, 'completed');
    assert.equal(view.percent, 100);
    assert.equal(view.attempt, 1);
    assert.deepEqual(view.result, PREVIEW);
    assert.equal(view.error, null);
  });

  test('retries a provider outage and succeeds on a later attempt', async () => {
    let calls = 0;
    const jobs = createJobs(async () => {
      calls += 1;
      if (calls < 3) throw aiUnavailable();
      return PREVIEW;
    });

    const view = await waitForFinish(jobs, jobs.enqueue(jobData()));

    assert.equal(view.state, 'completed');
    assert.equal(view.attempt, 3);
  });

  test('fails a file problem at once, without spending retries', async () => {
    let calls = 0;
    const jobs = createJobs(async () => {
      calls += 1;
      throw notADiary();
    });

    const view = await waitForFinish(jobs, jobs.enqueue(jobData()));

    assert.equal(calls, 1);
    assert.equal(view.state, 'failed');
    assert.deepEqual(view.error, { message: 'This PDF is a bank statement.', code: 'NOT_A_FOOD_DIARY', retryable: false });
  });

  test('gives up after the last attempt and reports the outage as retryable', async () => {
    let calls = 0;
    const jobs = createJobs(async () => {
      calls += 1;
      throw aiUnavailable();
    });

    const view = await waitForFinish(jobs, jobs.enqueue(jobData()));

    assert.equal(calls, view.maxAttempts);
    assert.equal(view.state, 'failed');
    assert.equal(view.error?.code, 'AI_UNAVAILABLE');
    assert.equal(view.error?.retryable, true);
  });

  test('hides a job from every user but its owner', async () => {
    const jobs = createJobs(async () => PREVIEW);
    const jobId = jobs.enqueue(jobData());

    assert.equal(jobs.find(jobId, 'someone-else'), null);
    assert.notEqual(jobs.find(jobId, OWNER_ID), null);
  });

  test('never runs more jobs at once than its concurrency allows', async () => {
    let running = 0;
    let mostAtOnce = 0;
    const jobs = createJobs(async () => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return PREVIEW;
    }, 2);

    const jobIds = Array.from({ length: 5 }, () => jobs.enqueue(jobData()));
    await Promise.all(jobIds.map((jobId) => waitForFinish(jobs, jobId)));

    assert.equal(mostAtOnce, 2);
  });
});

describe('import job failures', () => {
  test('survive the round trip through a BullMQ failure reason', () => {
    const failure = toImportJobFailure(aiUnavailable());
    assert.deepEqual(decodeImportJobFailure(encodeImportJobFailure(failure)), failure);
  });

  test('read a reason BullMQ wrote itself (a stalled job) as a generic, retryable failure', () => {
    const failure = decodeImportJobFailure('job stalled more than allowable limit');
    assert.equal(failure.code, 'IMPORT_FAILED');
    assert.equal(failure.retryable, true);
  });

  test('never pass an unexpected error message on to the client', (t) => {
    t.mock.method(console, 'error', () => undefined);
    const failure = toImportJobFailure(new Error('connection refused at 10.0.0.4:27017'));
    assert.equal(failure.code, 'IMPORT_FAILED');
    assert.doesNotMatch(failure.message, /10\.0\.0\.4/);
  });
});

describe('GET /api/food-entries/import/jobs/:jobId', () => {
  let server: TestServer;
  let owner: TestUser;

  before(async () => {
    server = await startTestServer();
    owner = await createTestUser('import-job-owner');
  });

  after(async () => {
    await server.close();
  });

  test('returns 404 for a job that does not exist', async () => {
    const result = await server.request(owner, 'GET', `/api/food-entries/import/jobs/${randomUUID()}`);
    assert.equal(result.status, 404);
    assert.equal(result.body.code, 'IMPORT_JOB_NOT_FOUND');
  });

  test('rejects an id that is not a job id', async () => {
    const result = await server.request(owner, 'GET', '/api/food-entries/import/jobs/not-a-job');
    assert.equal(result.status, 400);
  });

  test('requires a session', async () => {
    const result = await server.request(null, 'GET', `/api/food-entries/import/jobs/${randomUUID()}`);
    assert.equal(result.status, 401);
  });
});
