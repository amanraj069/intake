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
 * Caps the whole failover chain, not just one call: with four keys and two
 * models a slow outage could otherwise hold a user on a spinner for minutes.
 */
const TOTAL_BUDGET_MS = 25 * 1000;

/**
 * Stable models only, most capable first. The fallback exists for when the
 * primary model is overloaded or out of quota on every key at once.
 */
const DEFAULT_MODELS = ['gemini-3.7-flash', 'gemini-3.5-flash'];

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

async function postGenerateContent(
  model: string,
  apiKey: string,
  request: StructuredGenerationRequest,
  deadline: AbortSignal
): Promise<Response> {
  if (deadline.aborted) {
    throw new GeminiUnavailableError('The Gemini time budget ran out before a key succeeded');
  }

  const attemptTimeoutMs = request.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS;

  try {
    return await fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.any([deadline, AbortSignal.timeout(attemptTimeoutMs)]),
      body: JSON.stringify({
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
      }),
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'network error';
    throw new GeminiRequestError(`Gemini request did not complete: ${reason}`, 'unavailable');
  }
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

async function generateWithModel(
  model: string,
  apiKey: string,
  request: StructuredGenerationRequest,
  deadline: AbortSignal
): Promise<unknown> {
  const response = await postGenerateContent(model, apiKey, request, deadline);

  if (!response.ok) {
    throw await toGeminiRequestError(response);
  }

  return extractJson((await response.json()) as GenerateContentResponse);
}

/**
 * Asks Gemini for JSON matching `responseSchema`, failing over across every
 * configured key and then across models. Resolves with the parsed but
 * *unvalidated* JSON: the caller owns the domain rules for what is acceptable.
 *
 * @throws GeminiUnavailableError when no key/model combination succeeds in time.
 * @throws GeminiRequestError with kind `invalid-request` when the request itself is wrong.
 */
export async function generateStructuredJson(request: StructuredGenerationRequest): Promise<unknown> {
  const pool = getKeyPool();
  if (pool.size === 0) {
    throw new GeminiUnavailableError('No Gemini API keys are configured (GEMINI_KEY1, GEMINI_KEY2, ...)');
  }

  const deadline = AbortSignal.timeout(request.totalBudgetMs ?? TOTAL_BUDGET_MS);

  for (const model of getModels()) {
    try {
      return await pool.run((apiKey) => generateWithModel(model, apiKey, request, deadline));
    } catch (cause) {
      const modelFailed =
        cause instanceof GeminiKeysExhaustedError ||
        (cause instanceof GeminiRequestError && cause.kind === 'model-unavailable');

      if (!modelFailed) throw cause;
      console.warn(`[Gemini] Model ${model} could not serve the request: ${(cause as Error).message}`);
    }
  }

  throw new GeminiUnavailableError('Every configured Gemini model and key failed');
}
