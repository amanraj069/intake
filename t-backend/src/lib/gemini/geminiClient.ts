import {
  GeminiKeysExhaustedError,
  GeminiRequestError,
  GeminiUnavailableError,
  toGeminiRequestError,
} from './geminiErrors';
import { GeminiKeyPool, readGeminiKeysFromEnv } from './geminiKeyPool';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ATTEMPT_TIMEOUT_MS = 12 * 1000;
/**
 * Caps the whole failover chain, not just one call: with several keys and
 * models a slow outage could otherwise hold a user on a spinner for minutes.
 */
const TOTAL_BUDGET_MS = 25 * 1000;

/**
 * Stable Flash models only, most capable first. The later entries exist for
 * when an earlier model is overloaded, or out of quota on every key at once.
 */
const DEFAULT_MODELS = [
  // 'gemini-3.8-flash',
  // 'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

/** An OpenAPI-subset schema, as accepted by Gemini's `responseSchema`. */
export type GeminiResponseSchema = Record<string, unknown>;

/** An image sent inline with the prompt, as raw bytes plus their media type. */
export interface InlineImage {
  mimeType: string;
  data: Buffer;
}

export interface StructuredGenerationRequest {
  systemInstruction: string;
  prompt: string;
  responseSchema: GeminiResponseSchema;
  images?: readonly InlineImage[];
  /** Overrides for slower requests, such as image analysis. */
  attemptTimeoutMs?: number;
  totalBudgetMs?: number;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

let sharedPool: GeminiKeyPool | null = null;

/** Created on first use so dotenv has populated the environment by then. */
function getKeyPool(): GeminiKeyPool {
  sharedPool ??= new GeminiKeyPool(readGeminiKeysFromEnv());
  return sharedPool;
}

function getModels(): string[] {
  const configured = process.env.GEMINI_MODELS?.split(',').map((model) => model.trim());
  const models = configured?.filter(Boolean) ?? [];
  return models.length > 0 ? models : DEFAULT_MODELS;
}

/** Images go before the text: Gemini's guidance is that this ordering reads the image more reliably. */
function buildUserParts(request: StructuredGenerationRequest) {
  const imageParts = (request.images ?? []).map((image) => ({
    inlineData: { mimeType: image.mimeType, data: image.data.toString('base64') },
  }));
  return [...imageParts, { text: request.prompt }];
}

/**
 * POSTs one `generateContent` request and returns the parsed success payload.
 * Transport failures and non-2xx responses surface as typed Gemini errors, so
 * the failover loop can decide whether another key or model is worth trying.
 */
export async function postGenerateContent(
  model: string,
  apiKey: string,
  requestBody: Record<string, unknown>,
  deadline: AbortSignal,
  attemptTimeoutMs: number = ATTEMPT_TIMEOUT_MS
): Promise<unknown> {
  if (deadline.aborted) {
    throw new GeminiUnavailableError('The Gemini time budget ran out before a key succeeded');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.any([deadline, AbortSignal.timeout(attemptTimeoutMs)]),
      body: JSON.stringify(requestBody),
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'network error';
    throw new GeminiRequestError(`Gemini request did not complete: ${reason}`, 'unavailable');
  }

  if (!response.ok) {
    throw await toGeminiRequestError(response);
  }

  try {
    return await response.json();
  } catch {
    throw new GeminiRequestError('Gemini returned a body that is not JSON', 'bad-response');
  }
}

function buildStructuredRequestBody(request: StructuredGenerationRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: [{ role: 'user', parts: buildUserParts(request) }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: request.responseSchema,
      // Extended reasoning adds several seconds and buys little for a
      // bounded, schema-constrained answer the caller validates anyway.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  };
}

function extractJson(payload: GenerateContentResponse): unknown {
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim();

  if (!text) {
    const reason = candidate?.finishReason ?? 'no candidates';
    throw new GeminiRequestError(`Gemini returned no content (${reason})`, 'bad-response');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiRequestError('Gemini returned text that is not valid JSON', 'bad-response');
  }
}

function canTryNextModel(cause: unknown): boolean {
  if (cause instanceof GeminiKeysExhaustedError) return true;
  return cause instanceof GeminiRequestError && cause.canSwitchModel;
}

/** One attempt against a specific model and key, sharing the caller's overall deadline. */
export type ModelAttempt<TResult> = (
  model: string,
  apiKey: string,
  deadline: AbortSignal
) => Promise<TResult>;

/**
 * Runs `attempt` across every configured model and key until one succeeds.
 * Key-specific failures (quota, bad key) rotate keys; an overloaded or missing
 * model moves straight to the next model on the same key, since other keys
 * would hit the same shared capacity.
 *
 * @throws GeminiUnavailableError when no key/model combination succeeds in time.
 * @throws GeminiRequestError with kind `invalid-request` when the request itself is wrong.
 */
export async function runAcrossModels<TResult>(
  totalBudgetMs: number,
  attempt: ModelAttempt<TResult>
): Promise<TResult> {
  const pool = getKeyPool();
  if (pool.size === 0) {
    throw new GeminiUnavailableError('No Gemini API keys are configured (GEMINI_KEY1, GEMINI_KEY2, ...)');
  }

  const deadline = AbortSignal.timeout(totalBudgetMs);

  for (const model of getModels()) {
    try {
      return await pool.run((apiKey) => attempt(model, apiKey, deadline));
    } catch (cause) {
      if (!canTryNextModel(cause)) throw cause;
      console.warn(`[Gemini] Model ${model} could not serve the request: ${(cause as Error).message}`);
    }
  }

  throw new GeminiUnavailableError('Every configured Gemini model and key failed');
}

/**
 * Asks Gemini for JSON matching `responseSchema`, failing over across keys and
 * models (see `runAcrossModels`). Resolves with the parsed but *unvalidated*
 * JSON: the caller owns the domain rules for what is acceptable.
 *
 * @throws GeminiUnavailableError when no key/model combination succeeds in time.
 * @throws GeminiRequestError with kind `invalid-request` when the request itself is wrong.
 */
export async function generateStructuredJson(request: StructuredGenerationRequest): Promise<unknown> {
  const requestBody = buildStructuredRequestBody(request);

  return runAcrossModels(request.totalBudgetMs ?? TOTAL_BUDGET_MS, async (model, apiKey, deadline) => {
    const payload = await postGenerateContent(model, apiKey, requestBody, deadline, request.attemptTimeoutMs);
    return extractJson(payload as GenerateContentResponse);
  });
}
