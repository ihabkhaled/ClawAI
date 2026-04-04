import { HttpMethod } from "@/enums";
import type { ApiError, ApiRequestConfig, ApiResponse } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem("claw-auth-storage");
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed
    ) {
      const state = (parsed as { state: { accessToken?: string } }).state;
      return state.accessToken ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export class ApiClientError extends Error {
  public status: number;
  public errors?: Record<string, string[]>;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.status = apiError.status;
    this.errors = apiError.errors;
  }
}

async function request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(config.path, config.params), {
    method: config.method,
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  });

  if (!response.ok) {
    let errorBody: ApiError;
    try {
      errorBody = (await response.json()) as ApiError;
    } catch {
      errorBody = {
        message: response.statusText || "An unexpected error occurred",
        status: response.status,
      };
    }
    errorBody.status = response.status;

    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("claw-auth-storage");
      window.location.href = "/login";
    }

    throw new ApiClientError(errorBody);
  }

  if (response.status === 204) {
    return { data: undefined as T, status: response.status };
  }

  const data = (await response.json()) as T;
  return { data, status: response.status };
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string>) {
    return request<T>({ method: HttpMethod.GET, path, params });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>({ method: HttpMethod.POST, path, body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>({ method: HttpMethod.PUT, path, body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>({ method: HttpMethod.PATCH, path, body });
  },
  delete<T>(path: string) {
    return request<T>({ method: HttpMethod.DELETE, path });
  },
};
