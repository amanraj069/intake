import {
  GeminiRequestError,
  GeminiUnavailableError,
  toGeminiRequestError,
} from './geminiErrors';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ATTEMPT_TIMEOUT_MS = 12 * 1000;

export interface GeminiStreamChunkPart {
  text?: string;
  thought?: boolean;
  functionCall?: {
    id?: string;
    name: string;
    args?: Record<string, unknown>;
  };
  [field: string]: unknown;
}

export interface GeminiStreamChunk {
  candidates?: {
    content?: {
      role?: string;
      parts?: GeminiStreamChunkPart[];
    };
    finishReason?: string;
    [field: string]: unknown;
  }[];
  [field: string]: unknown;
}

/**
 * POSTs one `streamGenerateContent?alt=sse` request to Gemini, reads the SSE chunks
 * incrementally as they arrive, and invokes `onChunk` for each candidate packet.
 */
export async function postStreamGenerateContent(
  model: string,
  apiKey: string,
  requestBody: Record<string, unknown>,
  deadline: AbortSignal,
  onChunk: (chunk: GeminiStreamChunk) => void,
  attemptTimeoutMs: number = ATTEMPT_TIMEOUT_MS
): Promise<void> {
  if (deadline.aborted) {
    throw new GeminiUnavailableError('The Gemini time budget ran out before a key succeeded');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.any([deadline, AbortSignal.timeout(attemptTimeoutMs)]),
      body: JSON.stringify(requestBody),
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'network error';
    throw new GeminiRequestError(`Gemini stream request did not complete: ${reason}`, 'unavailable');
  }

  if (!response.ok) {
    throw await toGeminiRequestError(response);
  }

  if (!response.body) {
    throw new GeminiRequestError('Gemini returned an empty response body stream', 'bad-response');
  }

  let receivedChunks = 0;
  try {
    let buffer = '';
    const decoder = new TextDecoder();
    for await (const rawChunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(rawChunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr) as GeminiStreamChunk;
          receivedChunks += 1;
          onChunk(parsed);
        } catch {
          // Skip corrupt chunk or log warning
          console.warn('[GeminiStream] Malformed SSE data chunk received:', dataStr);
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      const dataStr = buffer.trim().slice(5).trim();
      if (dataStr && dataStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataStr) as GeminiStreamChunk;
          receivedChunks += 1;
          onChunk(parsed);
        } catch {
          // Skip corrupt trailing chunk
        }
      }
    }
  } catch (cause) {
    if (deadline.aborted) {
      throw new GeminiUnavailableError('The Gemini time budget ran out during streaming');
    }
    const reason = cause instanceof Error ? cause.message : 'stream read failure';
    throw new GeminiRequestError(`Gemini stream interrupted: ${reason}`, 'unavailable');
  }

  if (receivedChunks === 0) {
    throw new GeminiRequestError('Gemini stream finished with zero candidate chunks', 'bad-response');
  }
}
