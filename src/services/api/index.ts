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

function readXhrBody(xhr: XMLHttpRequest) {
  const text = xhr.responseText;
  if (!text) return null;

  const contentType = xhr.getResponseHeader("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function getErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }

  if (status === 0) return "Backend unavailable or blocked by a network/CORS issue. Please check the API URL and try again.";
  if (status === 401) return "Login required. Please sign in again.";
  if (status === 402) return "Free analysis limit reached. Please upgrade to continue.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 423) return "Account temporarily locked due to multiple failed login attempts.";
  if (status === 429) return "Too many requests. Please try again later.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "This record already exists.";
  if (status === 422) return "Please check the form fields and try again.";
  if (status >= 500) return "The backend is temporarily unavailable. Please try again in a moment.";

  return "The request could not be completed.";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isPaymentRequiredError(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 402;
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

export type UploadRequestOptions = {
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
};

export function apiUploadRequest<T>(
  path: string,
  body: FormData,
  options: UploadRequestOptions = {}
): Promise<T> {
  if (typeof XMLHttpRequest === "undefined") {
    return Promise.reject(new ApiError(0, "Browser upload is unavailable in this environment."));
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", handleAbort);
      callback();
    };

    const handleAbort = () => xhr.abort();

    xhr.open("POST", buildUrl(path));
    xhr.setRequestHeader("Accept", "application/json");

    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(event.loaded, event.total);
      }
    });

    xhr.addEventListener("load", () => {
      const responseBody = readXhrBody(xhr);

      if (xhr.status >= 200 && xhr.status < 300) {
        settle(() => resolve(responseBody as T));
        return;
      }

      if (xhr.status === 401) {
        clearStoredAuth();
        dispatchAuthInvalidated();
      }

      settle(() => reject(new ApiError(xhr.status, getErrorMessage(xhr.status, responseBody), responseBody)));
    });

    xhr.addEventListener("error", () => {
      settle(() => reject(new ApiError(0, getErrorMessage(0, null))));
    });

    xhr.addEventListener("abort", () => {
      settle(() => reject(new DOMException("Upload cancelled.", "AbortError")));
    });

    if (options.signal?.aborted) {
      settle(() => reject(new DOMException("Upload cancelled.", "AbortError")));
      return;
    }

    options.signal?.addEventListener("abort", handleAbort, { once: true });
    xhr.send(body);
  });
}
