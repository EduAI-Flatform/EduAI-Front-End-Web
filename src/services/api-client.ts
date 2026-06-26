import { clearAuthSessionStorage } from "./auth-session.storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiClientOptions {
  baseUrl?: string;
  getAccessToken?: () => string | null | undefined;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: ApiClientOptions["getAccessToken"];

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? API_BASE_URL);
    this.getAccessToken = options.getAccessToken;
  }

  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: ApiRequestOptions["body"],
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, { ...options, body, method: "POST" });
  }

  put<T>(
    path: string,
    body?: ApiRequestOptions["body"],
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, { ...options, body, method: "PUT" });
  }

  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      ...options,
      body: serializeBody(options.body),
      headers: this.buildHeaders(options),
    });

    const payload = await parseApiResponse<T>(response);

    if (!payload.success) {
      if (response.status === 401 && this.getAccessToken?.()) {
        clearAuthSessionStorage();
      }

      throw new ApiClientError(
        payload.error.message,
        payload.error.code,
        response.status,
      );
    }

    return payload.data;
  }

  private buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  private buildHeaders(options: ApiRequestOptions): Headers {
    const headers = new Headers(options.headers);
    const body = options.body;
    const token = this.getAccessToken?.();

    if (body && isJsonBody(body) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }
}

export const apiClient = new ApiClient();

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function serializeBody(body: ApiRequestOptions["body"]): BodyInit | null | undefined {
  if (!body || !isJsonBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function isJsonBody(body: ApiRequestOptions["body"]): body is Record<string, unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams)
  );
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("Content-Type");

  if (!contentType?.includes("application/json")) {
    if (response.ok) {
      return {
        success: true,
        data: undefined as T,
        message: "Thành công",
      };
    }

    return {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: response.statusText || "Yêu cầu thất bại",
      },
    };
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!isApiResponse(payload)) {
    return {
      success: false,
      error: {
        code: "INVALID_API_RESPONSE",
        message: "Định dạng phản hồi API không hợp lệ",
      },
    };
  }

  return payload;
}

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  if (typeof payload !== "object" || payload === null || !("success" in payload)) {
    return false;
  }

  const response = payload as Partial<ApiResponse<T>>;
  return response.success === true || response.success === false;
}
