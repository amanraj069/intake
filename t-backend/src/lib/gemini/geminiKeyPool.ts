import { GeminiKeysExhaustedError, GeminiRequestError } from './geminiErrors';

const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const REJECTED_KEY_COOLDOWN_MS = 60 * 60 * 1000;

interface PooledKey {
  /** 1-based position, used in logs so a key's secret never is. */
  label: string;
  secret: string;
  coolingUntil: number;
}

/**
 * Round-robin failover across several Gemini API keys.
 *
 * The pool is sticky: whichever key last succeeded is tried first on the next
 * call, so a healthy key keeps serving traffic and a failing one is only
 * revisited once the others run into trouble. A key that was rate limited or
 * rejected is benched for a while, so every request does not pay for a
 * round trip we already know will fail.
 */
export class GeminiKeyPool {
  private readonly keys: PooledKey[];
  private activeIndex = 0;

  constructor(
    secrets: readonly string[],
    private readonly now: () => number = Date.now
  ) {
    this.keys = secrets.map((secret, index) => ({
      label: `key #${index + 1}`,
      secret,
      coolingUntil: 0,
    }));
  }

  get size(): number {
    return this.keys.length;
  }

  /**
   * Runs `attempt` with each key in turn until one succeeds. Failures that a
   * different key cannot fix (a malformed request, an unknown model) are
   * rethrown immediately instead of burning through the rest of the pool.
   */
  async run<TResult>(attempt: (apiKey: string) => Promise<TResult>): Promise<TResult> {
    const failures: GeminiRequestError[] = [];

    for (const index of this.attemptOrder()) {
      const key = this.keys[index];

      try {
        const result = await attempt(key.secret);
        this.markHealthy(index);
        return result;
      } catch (cause) {
        if (!(cause instanceof GeminiRequestError) || !cause.canRotateKey) {
          throw cause;
        }
        this.markFailed(key, cause);
        failures.push(cause);
        console.warn(`[Gemini] ${key.label} failed (${cause.kind}: ${cause.message}), rotating`);
      }
    }

    throw new GeminiKeysExhaustedError(failures);
  }

  /**
   * Starts from the sticky key and wraps around. Keys still cooling down go to
   * the back rather than being skipped, so a pool where every key is benched
   * still makes one last attempt instead of failing without trying.
   */
  private attemptOrder(): number[] {
    const rotated = this.keys.map((_, offset) => (this.activeIndex + offset) % this.keys.length);
    const currentTime = this.now();
    const ready = rotated.filter((index) => this.keys[index].coolingUntil <= currentTime);
    const cooling = rotated.filter((index) => this.keys[index].coolingUntil > currentTime);
    return [...ready, ...cooling];
  }

  private markHealthy(index: number): void {
    this.keys[index].coolingUntil = 0;
    this.activeIndex = index;
  }

  private markFailed(key: PooledKey, failure: GeminiRequestError): void {
    const cooldownMs = cooldownFor(failure);
    if (cooldownMs > 0) {
      key.coolingUntil = this.now() + cooldownMs;
    }
  }
}

function cooldownFor(failure: GeminiRequestError): number {
  if (failure.kind === 'key-rejected') return REJECTED_KEY_COOLDOWN_MS;
  if (failure.kind !== 'rate-limited') return 0;
  return failure.retryAfterSeconds ? failure.retryAfterSeconds * 1000 : RATE_LIMIT_COOLDOWN_MS;
}

const KEY_ENV_PATTERN = /^GEMINI_KEY(\d+)$/;

/** Reads GEMINI_KEY1, GEMINI_KEY2, ... in numeric order, skipping blanks. */
export function readGeminiKeysFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env)
    .map(([name, value]) => ({ order: Number(KEY_ENV_PATTERN.exec(name)?.[1]), value }))
    .filter((entry): entry is { order: number; value: string } =>
      Number.isFinite(entry.order) && Boolean(entry.value?.trim())
    )
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.value.trim());
}
