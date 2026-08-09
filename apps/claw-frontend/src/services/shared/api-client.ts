import { httpClient } from '@/lib/http-client';
import type { ApiClientDeleteOptions, ApiClientRequestOptions, ApiResponse } from '@/types';

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  // Backend BusinessException carries a machine-readable `code` (e.g.
  // PLAN_FEATURE_DISABLED, INSUFFICIENT_PERMISSIONS) so the FE can map a
  // specific error to a tailored UX (e.g. plan upgrade CTA) instead of a
  // generic toast.
  code?: string;

  constructor(params: {
    message: string;
    status: number;
    errors?: Record<string, string[]>;
    code?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.errors = params.errors;
    this.code = params.code;
  }
}

export const apiClient = {
  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.get<T>(path, { params });
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async getBlob(path: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await httpClient.get<Blob>(path, { responseType: 'blob' });
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async post<T>(
    path: string,
    body?: unknown,
    options?: ApiClientRequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.post<T>(path, body, {
        timeout: options?.timeout,
        signal: options?.signal,
      });
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.put<T>(path, body);
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.patch<T>(path, body);
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async delete<T>(path: string, options?: ApiClientDeleteOptions): Promise<ApiResponse<T>> {
    try {
      const response = options
        ? await httpClient.delete<T>(path, options)
        : await httpClient.delete<T>(path);
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },
};

/**
 * Sanitizes backend error responses so internal details are never exposed
 * to users. For 5xx (server) errors, a generic message is always used
 * regardless of what the backend returned, since those messages may
 * contain stack traces, SQL errors, or infrastructure details.
 */
function toApiClientError(error: unknown): ApiClientError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status: number;
        data?: {
          message?: string;
          code?: string;
          errorCode?: string;
          errors?: Record<string, string[]>;
        };
      };
    };

    const status = axiosError.response?.status ?? 500;
    const isServerError = status >= 500;

    return new ApiClientError({
      message: isServerError
        ? 'An unexpected server error occurred. Please try again later.'
        : (axiosError.response?.data?.message ?? 'An unexpected error occurred'),
      status,
      errors: isServerError ? undefined : axiosError.response?.data?.errors,
      // 5xx codes (if any) are intentionally suppressed alongside details so
      // we never leak internals via the `code` field either.
      code: isServerError
        ? undefined
        : (axiosError.response?.data?.errorCode ?? axiosError.response?.data?.code),
    });
  }
  return new ApiClientError({ message: 'Network error', status: 0 });
}
