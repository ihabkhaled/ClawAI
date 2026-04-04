import { httpClient } from '@/lib/http-client';
import type { ApiResponse } from '@/types';

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(params: {
    message: string;
    status: number;
    errors?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.errors = params.errors;
  }
}

export const apiClient = {
  async get<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.get<T>(path, { params });
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.post<T>(path, body);
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

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await httpClient.delete<T>(path);
      return { data: response.data, status: response.status };
    } catch (error) {
      throw toApiClientError(error);
    }
  },
};

function toApiClientError(error: unknown): ApiClientError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status: number;
        data?: { message?: string; errors?: Record<string, string[]> };
      };
    };
    return new ApiClientError({
      message:
        axiosError.response?.data?.message ?? 'An unexpected error occurred',
      status: axiosError.response?.status ?? 500,
      errors: axiosError.response?.data?.errors,
    });
  }
  return new ApiClientError({ message: 'Network error', status: 0 });
}
