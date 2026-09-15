import { GeminiResponseSchema, postGenerateContent, runAcrossModels } from './geminiClient';
import { GeminiRequestError } from './geminiErrors';
import { postStreamGenerateContent } from './geminiStream';

/**
 * Gemini's native function-calling dialect: multi-turn `contents`, tool
 * declarations, and the call/response parts that pass between them.
 */

export type GeminiRole = 'user' | 'model';

export interface GeminiFunctionCall {
  /** Present on newer models; echoed back so parallel calls pair with their responses. */
  id?: string;
  name: string;
  args?: Record<string, unknown>;
}

export interface GeminiFunctionResponse {
  id?: string;
  name: string;
  response: Record<string, unknown>;
}

/**
 * A part is kept as the model sent it, unknown fields included: Gemini 3 attaches
 * a `thoughtSignature` to function calls that must be replayed verbatim on the
 * next request, or the model loses the reasoning that led to the call.
 */
export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
  [field: string]: unknown;
}

export interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: GeminiResponseSchema;
}

export interface ConversationTurnRequest {
  systemInstruction: string;
  contents: readonly GeminiContent[];
  functionDeclarations: readonly GeminiFunctionDeclaration[];
  attemptTimeoutMs: number;
  totalBudgetMs: number;
}

export interface ConversationStreamCallbacks {
  onTextDelta?: (delta: string) => void;
}

/** Produces the model's next turn. Injectable so the agent loop can be tested without the network. */
export type ConversationTurnGenerator = (
  request: ConversationTurnRequest,
  callbacks?: ConversationStreamCallbacks
) => Promise<GeminiContent>;

interface ConversationResponsePayload {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
}

function buildConversationBody(request: ConversationTurnRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.contents,
    tools: [{ functionDeclarations: request.functionDeclarations }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    generationConfig: {
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  };
}

function extractModelContent(payload: ConversationResponsePayload): GeminiContent {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  if (parts.length === 0) {
    const reason = candidate?.finishReason ?? 'no candidates';
    throw new GeminiRequestError(`Gemini returned an empty turn (${reason})`, 'bad-response');
  }

  return { role: 'model', parts };
}

/**
 * Asks Gemini for the next model turn of a conversation, which may be text,
 * function calls, or both. Fails over across keys and models like every other
 * Gemini call in the app.
 */
export const generateConversationTurn: ConversationTurnGenerator = (request) => {
  const requestBody = buildConversationBody(request);

  return runAcrossModels(request.totalBudgetMs, async (model, apiKey, deadline) => {
    const payload = await postGenerateContent(model, apiKey, requestBody, deadline, request.attemptTimeoutMs);
    return extractModelContent(payload as ConversationResponsePayload);
  });
};

/**
 * Streaming version of `generateConversationTurn`: calls Gemini's SSE endpoint
 * and invokes `callbacks.onTextDelta` in real-time as text tokens arrive,
 * while still collecting and returning the complete `GeminiContent` for tool
 * calls, thought signatures, and history.
 */
export const generateConversationTurnStream: ConversationTurnGenerator = (request, callbacks) => {
  const requestBody = buildConversationBody(request);

  return runAcrossModels(request.totalBudgetMs, async (model, apiKey, deadline) => {
    const accumulatedParts: GeminiPart[] = [];

    await postStreamGenerateContent(
      model,
      apiKey,
      requestBody,
      deadline,
      (chunk) => {
        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];

        for (const part of parts) {
          if (typeof part.text === 'string') {
            if (!part.thought) {
              callbacks?.onTextDelta?.(part.text);
            }
            const lastPart = accumulatedParts[accumulatedParts.length - 1];
            if (lastPart && typeof lastPart.text === 'string' && Boolean(lastPart.thought) === Boolean(part.thought)) {
              lastPart.text += part.text;
            } else {
              accumulatedParts.push({ ...part });
            }
          } else {
            accumulatedParts.push({ ...part });
          }
        }
      },
      request.attemptTimeoutMs
    );

    if (accumulatedParts.length === 0) {
      throw new GeminiRequestError('Gemini returned an empty stream turn', 'bad-response');
    }

    return { role: 'model', parts: accumulatedParts };
  });
};

export function functionCallsIn(content: GeminiContent): GeminiFunctionCall[] {
  return content.parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
}

export function textIn(content: GeminiContent): string {
  return content.parts
    .map((part) => (typeof part.text === 'string' && !part.thought ? part.text : ''))
    .join('')
    .trim();
}

