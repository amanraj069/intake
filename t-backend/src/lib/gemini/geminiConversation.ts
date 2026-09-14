import { GeminiResponseSchema, postGenerateContent, runAcrossModels } from './geminiClient';
import { GeminiRequestError } from './geminiErrors';

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

/** Produces the model's next turn. Injectable so the agent loop can be tested without the network. */
export type ConversationTurnGenerator = (request: ConversationTurnRequest) => Promise<GeminiContent>;

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

export function functionCallsIn(content: GeminiContent): GeminiFunctionCall[] {
  return content.parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
}

export function textIn(content: GeminiContent): string {
  return content.parts
    .map((part) => (typeof part.text === 'string' && !part.thought ? part.text : ''))
    .join('')
    .trim();
}
