export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  /** A stable failure identifier, present on errors the client may handle specially. */
  code?: string;
  /** Extra state sent with some failures so the client can recover, e.g. a stored chat message. */
  details?: Record<string, unknown>;
}

/**
 * The envelope every list endpoint returns: one page of records in `data`,
 * with the metadata a client needs to render page controls beside it.
 */
export interface PaginatedResponse<TItem> extends ApiResponse<TItem[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
    this.details = details;
  }
}

/** A non-JSON body (proxy error page, gateway timeout) must not surface as a parse crash. */
async function parseBody<TResponse>(response: Response): Promise<TResponse> {
  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new ApiError(`The server returned an unreadable response (${response.status})`, response.status);
  }
}

let refreshPromise: Promise<void> | null = null;

/** The refresh and login calls answer 401 themselves; refreshing on them would loop. */
function canRefreshAfter(endpoint: string): boolean {
  return endpoint !== "/auth/refresh" && endpoint !== "/auth/login";
}

/** fetch only rejects on transport failure, so callers get one predictable error type instead of a bare TypeError. */
async function fetchOrThrow(endpoint: string, config: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${endpoint}`, config);
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
}

/**
 * Exchanges the refresh cookie for new tokens. Requests that hit a 401 at the
 * same time share one call, because each refresh retires the cookie it used.
 */
function refreshSession(): Promise<void> {
  refreshPromise ??= fetchOrThrow("/auth/refresh", { method: "POST", credentials: "include" })
    .then(async (res) => {
      if (res.ok) return;
      const body = await parseBody<ApiResponse>(res);
      throw new ApiError(body.message || "Your session has expired.", res.status, undefined, body.code);
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * True when the session was renewed and the request is worth retrying, false
 * when the server says the session is over (401). Anything else (offline, a
 * restarting server, a 5xx) says nothing about the session, so it is thrown
 * for the caller to offer a retry instead of signing the user out.
 */
async function tryRefreshSession(): Promise<boolean> {
  try {
    await refreshSession();
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

async function send<TResponse extends ApiResponse<unknown>>(
  endpoint: string,
  options: RequestInit
): Promise<TResponse> {
  // FormData must keep the browser-generated multipart boundary, which only
  // happens when no Content-Type is set by hand.
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    credentials: "include", // Always send cookies
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetchOrThrow(endpoint, config);

  if (response.status === 401 && canRefreshAfter(endpoint) && (await tryRefreshSession())) {
    const retryResponse = await fetchOrThrow(endpoint, config);
    const retryBody = await parseBody<TResponse>(retryResponse);
    if (!retryResponse.ok) {
      throw new ApiError(
        retryBody.message || "Something went wrong",
        retryResponse.status,
        retryBody.errors,
        retryBody.code,
        retryBody.details
      );
    }
    return retryBody;
  }

  const body = await parseBody<TResponse>(response);

  if (!response.ok) {
    throw new ApiError(body.message || "Something went wrong", response.status, body.errors, body.code, body.details);
  }

  return body;
}

export function request<TData = undefined>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<TData>> {
  return send<ApiResponse<TData>>(endpoint, options);
}

/** Same transport as `request`, for endpoints that return the pagination envelope. */
export function requestPage<TItem>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PaginatedResponse<TItem>> {
  return send<PaginatedResponse<TItem>>(endpoint, options);
}

/** Event types the SSE streaming endpoint emits. */
export type SSEEventType = "token" | "status" | "done" | "error";

export interface SSEEvent<TData = unknown> {
  type: SSEEventType;
  data: TData;
}

/**
 * Opens an SSE connection to `endpoint` via POST and invokes `onEvent` for
 * each named event the server sends. When the stream ends, resolves with
 * the `done` event's data or rejects with the `error` event.
 *
 * Falls back to the standard `request` path when the server does not support
 * streaming (e.g. returns `application/json` instead of `text/event-stream`).
 */
export async function requestStream<TData = undefined>(
  endpoint: string,
  options: RequestInit,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<ApiResponse<TData>> {
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "text/event-stream",
      ...options.headers,
    },
    ...options,
    signal,
  };

  const response = await fetchOrThrow(endpoint, config);

  if (response.status === 401 && canRefreshAfter(endpoint) && (await tryRefreshSession())) {
    return requestStream<TData>(endpoint, options, onEvent, signal);
  }

  if (!response.ok) {
    const body = await parseBody<ApiResponse<TData>>(response);
    throw new ApiError(body.message || "Something went wrong", response.status, body.errors, body.code, body.details);
  }

  // If the server returned plain JSON instead of SSE (e.g. non-streaming fallback),
  // parse it directly and emit a synthetic done event.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const body = await parseBody<ApiResponse<TData>>(response);
    onEvent({ type: "done", data: body });
    return body;
  }

  // Read the SSE stream.
  if (!response.body) {
    throw new ApiError("The server returned an empty stream", 500);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: ApiResponse<TData> | undefined;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEventType: SSEEventType | null = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event:")) {
          currentEventType = trimmed.slice(6).trim() as SSEEventType;
          continue;
        }
        if (trimmed.startsWith("data:")) {
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            const eventType = currentEventType ?? "token";
            onEvent({ type: eventType, data: parsed });

            if (eventType === "done") {
              donePayload = parsed as ApiResponse<TData>;
            } else if (eventType === "error") {
              const errData = parsed as { message?: string; code?: string; details?: Record<string, unknown> };
              throw new ApiError(
                errData.message ?? "The assistant could not reply.",
                502,
                undefined,
                errData.code,
                errData.details
              );
            }
          } catch (e) {
            if (e instanceof ApiError) throw e;
            // Skip malformed chunk.
          }
          currentEventType = null;
          continue;
        }
        // Blank line resets event type per SSE spec.
        if (trimmed === "") {
          currentEventType = null;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (donePayload) return donePayload;
  throw new ApiError("The stream ended without a completion event", 502);
}

