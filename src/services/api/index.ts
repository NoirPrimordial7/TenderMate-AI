import { clearStoredAuth, getAccessToken } from "@/services/authStorage";

export const AUTH_INVALIDATED_EVENT = "tendermate:auth-invalidated";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  auth?: boolean;
  body?: unknown;
};

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer)
  );
}

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function dispatchAuthInvalidated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT));
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function getErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }

  if (status === 0) return "Backend unavailable or blocked by a network/CORS issue. Please check the API URL and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "This record already exists.";
  if (status === 422) return "Please check the form fields and try again.";
  if (status >= 500) return "The backend is temporarily unavailable. Please try again in a moment.";

  return "The request could not be completed.";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toFriendlyApiMessage(error: unknown, fallback: string) {
  if (isApiError(error)) {
    return error.message || fallback;
  }

  return fallback;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let requestBody: BodyInit | null | undefined;
  if (body !== undefined) {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      if (!requestHeaders.has("Content-Type")) {
        requestHeaders.set("Content-Type", "application/json");
      }
      requestBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      cache: "no-store",
      ...requestOptions,
      headers: requestHeaders,
      body: requestBody
    });
  } catch (error) {
    throw new ApiError(0, getErrorMessage(0, null), error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearStoredAuth();
      dispatchAuthInvalidated();
    }

    throw new ApiError(response.status, getErrorMessage(response.status, responseBody), responseBody);
  }

  return responseBody as T;
}
