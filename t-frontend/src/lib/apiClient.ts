export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  /** A stable failure identifier, present on errors the client may handle specially. */
  code?: string;
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

  constructor(message: string, status: number, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch {
    // fetch only rejects on transport failure, so callers get one predictable
    // error type instead of a bare TypeError.
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const body = await parseBody<TResponse>(response);

  if (!response.ok) {
    throw new ApiError(body.message || "Something went wrong", response.status, body.errors, body.code);
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
