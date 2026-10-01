import { randomUUID } from 'node:crypto';

import {
  FoodDiaryImportJobData,
  IMPORT_RETRY_POLICY,
  ImportJobFailure,
  ImportJobView,
  progressForStage,
  retryDelayMs,
  toImportJobFailure,
} from '../lib/foodDiaryImportJob';
import { ImportJobProcessor } from './importJobProcessor';

/** Long enough for a client that lost its connection mid-import to come back for the result. */
const FINISHED_JOB_RETENTION_MS = 60 * 60 * 1000;

interface MemoryImportJob {
  data: FoodDiaryImportJobData;
  view: ImportJobView;
}

export interface MemoryImportJobsOptions {
  process: ImportJobProcessor;
  concurrency: number;
  /** Overridable so tests do not wait out the real backoff. */
  retryDelayMs?: (attemptsMade: number) => number;
}

function initialView(jobId: string): ImportJobView {
  return {
    jobId,
    state: 'queued',
    stage: null,
    percent: 0,
    attempt: 0,
    maxAttempts: IMPORT_RETRY_POLICY.attempts,
    result: null,
    error: null,
  };
}

/**
 * The import queue for when Redis is not configured or not reachable. It keeps
 * the BullMQ queue's contract (a concurrency cap, retries with backoff, the
 * same job view), but jobs live in this process only: a restart loses them,
 * and the cap applies per instance rather than across all of them.
 */
export class MemoryImportJobs {
  private readonly jobs = new Map<string, MemoryImportJob>();
  private readonly waiting: string[] = [];
  private running = 0;

  constructor(private readonly options: MemoryImportJobsOptions) {}

  enqueue(data: FoodDiaryImportJobData): string {
    const jobId = randomUUID();
    this.jobs.set(jobId, { data, view: initialView(jobId) });
    this.waiting.push(jobId);
    this.startWaitingJobs();
    return jobId;
  }

  /** Another user's job is reported as missing, so a job id reveals nothing about whose it is. */
  find(jobId: string, userId: string): ImportJobView | null {
    const job = this.jobs.get(jobId);
    if (!job || job.data.userId !== userId) return null;
    return { ...job.view };
  }

  private startWaitingJobs(): void {
    while (this.running < this.options.concurrency && this.waiting.length > 0) {
      const jobId = this.waiting.shift()!;
      this.running += 1;
      void this.runAttempt(jobId).finally(() => {
        this.running -= 1;
        this.startWaitingJobs();
      });
    }
  }

  private async runAttempt(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const { view } = job;
    view.attempt += 1;
    view.state = 'processing';

    try {
      view.result = await this.options.process(job.data, (stage) => {
        Object.assign(view, progressForStage(stage));
      });
      view.state = 'completed';
      view.percent = 100;
      this.forgetLater(jobId);
    } catch (cause) {
      this.handleFailure(jobId, view, toImportJobFailure(cause));
    }
  }

  private handleFailure(jobId: string, view: ImportJobView, failure: ImportJobFailure): void {
    if (failure.retryable && view.attempt < view.maxAttempts) {
      view.state = 'retrying';
      const delayFor = this.options.retryDelayMs ?? retryDelayMs;
      setTimeout(() => {
        this.waiting.push(jobId);
        this.startWaitingJobs();
      }, delayFor(view.attempt)).unref();
      return;
    }

    view.state = 'failed';
    view.error = failure;
    this.forgetLater(jobId);
  }

  private forgetLater(jobId: string): void {
    setTimeout(() => this.jobs.delete(jobId), FINISHED_JOB_RETENTION_MS).unref();
  }
}
