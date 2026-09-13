/**
 * How a Gemini call failed decides who can recover from it: another key, another
 * model, or nobody. Classifying once here keeps that policy out of the retry
 * loops themselves.
 */
export type GeminiFailureKind =
  /** Quota or rate limit on this key. Another key may have headroom. */
  | 'rate-limited'
  /** The key itself is invalid, revoked, or lacks permission. */
  | 'key-rejected'
  /** Server error, timeout, or network failure. Worth retrying elsewhere. */
  | 'unavailable'
  /**
   * The model is overloaded for everyone (503 "high demand"). Capacity is shared
   * across keys, so the only useful retry is a different model on the same key.
   */
  | 'model-overloaded'
  /** The model returned nothing usable (empty, blocked, or not JSON). */
  | 'bad-response'
  /** This model id does not exist or is not served to these keys. */
  | 'model-unavailable'
  /** Our request is malformed. No key or model will accept it. */
  | 'invalid-request';

const KEY_ROTATABLE_KINDS: ReadonlySet<GeminiFailureKind> = new Set([
  'rate-limited',
  'key-rejected',
  'unavailable',
  'bad-response',
]);

export class GeminiRequestError extends Error {
  readonly kind: GeminiFailureKind;
  readonly status: number | null;
  /** Seconds the API asked us to wait, when it said so. */
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    kind: GeminiFailureKind,
    status: number | null = null,
    retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.name = 'GeminiRequestError';
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Whether trying the same request with a different key could succeed. */
  get canRotateKey(): boolean {
    return KEY_ROTATABLE_KINDS.has(this.kind);
  }

  /** Whether the model itself is the problem, so the next model should be tried. */
  get canSwitchModel(): boolean {
    return this.kind === 'model-unavailable' || this.kind === 'model-overloaded';
  }
}

/** Every configured key was tried for one model and none succeeded. */
export class GeminiKeysExhaustedError extends Error {
  readonly attempts: readonly GeminiRequestError[];

  constructor(attempts: readonly GeminiRequestError[]) {
    super(`All ${attempts.length} Gemini key attempt(s) failed`);
    this.name = 'GeminiKeysExhaustedError';
    this.attempts = attempts;
  }
}

/** No key/model combination could serve the request. The caller should degrade gracefully. */
export class GeminiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

interface GeminiErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: { reason?: string }[];
  };
}

/** Google reports a bad key as a 400, so the reason code matters as much as the status. */
function isKeyRejection(status: number, body: GeminiErrorBody): boolean {
  if (status === 401 || status === 403) return true;
  const reasons = body.error?.details?.map((detail) => detail.reason) ?? [];
  return reasons.includes('API_KEY_INVALID') || body.error?.status === 'PERMISSION_DENIED';
}

function kindForStatus(status: number, body: GeminiErrorBody): GeminiFailureKind {
  if (isKeyRejection(status, body)) return 'key-rejected';
  if (status === 429) return 'rate-limited';
  if (status === 404) return 'model-unavailable';
  if (status === 503) return 'model-overloaded';
  if (status >= 500) return 'unavailable';
  return 'invalid-request';
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Builds a typed error from a non-2xx Gemini HTTP response. */
export async function toGeminiRequestError(response: Response): Promise<GeminiRequestError> {
  let body: GeminiErrorBody = {};
  try {
    body = (await response.json()) as GeminiErrorBody;
  } catch {
    // A non-JSON error page still has a usable status code.
  }

  const kind = kindForStatus(response.status, body);
  const detail = body.error?.message ?? response.statusText;

  return new GeminiRequestError(
    `Gemini responded ${response.status}: ${detail}`,
    kind,
    response.status,
    parseRetryAfter(response.headers.get('retry-after'))
  );
}
