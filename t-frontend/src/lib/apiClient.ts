export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/** A non-JSON body (proxy error page, gateway timeout) must not surface as a parse crash. */
async function parseBody<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(`The server returned an unreadable response (${response.status})`, response.status);
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const config: RequestInit = {
    credentials: "include", // Always send cookies
    headers: {
      "Content-Type": "application/json",
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

  const data = await parseBody<T>(response);

  if (!response.ok) {
    throw new ApiError(data.message || "Something went wrong", response.status, data.errors);
  }

  return data;
}
