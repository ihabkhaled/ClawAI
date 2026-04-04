import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

import { ApiClientError, apiClient } from '@/services/shared/api-client';

type RequestRecord = {
  url: string;
  config: AxiosRequestConfig;
  data?: unknown;
};

const requests: RequestRecord[] = [];

vi.mock('@/lib/http-client', () => {
  function makeMethod(method: string) {
    return (url: string, dataOrConfig?: unknown, config?: unknown) => {
      const hasBody = ['post', 'put', 'patch'].includes(method);
      const record: RequestRecord = {
        url,
        config: ((hasBody ? config : dataOrConfig) ?? {}) as AxiosRequestConfig,
        data: hasBody ? dataOrConfig : undefined,
      };
      requests.push(record);

      const handler = mockHandlers.shift();
      if (handler) {
        if ('error' in handler) {
          return Promise.reject(handler.error);
        }
        return Promise.resolve(handler.response);
      }
      return Promise.reject(new Error('No mock handler configured'));
    };
  }

  return {
    httpClient: {
      get: makeMethod('get'),
      post: makeMethod('post'),
      put: makeMethod('put'),
      patch: makeMethod('patch'),
      delete: makeMethod('delete'),
    },
  };
});

type MockHandler =
  | { response: { data: unknown; status: number } }
  | { error: { response?: { status: number; data?: { message?: string; errors?: Record<string, string[]> } } } };

const mockHandlers: MockHandler[] = [];

function mockResponse(data: unknown, status = 200): void {
  mockHandlers.push({ response: { data, status } });
}

function mockError(
  status: number,
  data?: { message?: string; errors?: Record<string, string[]> },
): void {
  mockHandlers.push({ error: { response: { status, data } } });
}

describe('apiClient', () => {
  beforeEach(() => {
    requests.length = 0;
    mockHandlers.length = 0;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('makes a GET request to the correct URL', async () => {
    mockResponse({ id: 1, name: 'Test' });

    await apiClient.get('/users');

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('/users');
  });

  it('passes query params for GET requests', async () => {
    mockResponse({ ok: true });

    await apiClient.get('/users', { page: '1', limit: '10' });

    expect(requests[0]?.config).toEqual(
      expect.objectContaining({ params: { page: '1', limit: '10' } }),
    );
  });

  it('sends JSON body for POST requests', async () => {
    mockResponse({ id: 1 });
    const body = { name: 'Test', email: 'test@example.com' };

    await apiClient.post('/users', body);

    expect(requests[0]?.data).toEqual(body);
  });

  it('throws ApiClientError on error response', async () => {
    mockError(404, { message: 'Not Found' });

    await expect(apiClient.get('/missing')).rejects.toThrow(ApiClientError);
  });

  it('returns data and status on success', async () => {
    mockResponse({ id: 1, name: 'Test' });

    const result = await apiClient.get<{ id: number; name: string }>('/users');
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.status).toBe(200);
  });

  it('handles 204 No Content responses', async () => {
    mockResponse(undefined, 204);

    const result = await apiClient.delete('/users/1');
    expect(result.status).toBe(204);
  });

  it('returns correct error message and status', async () => {
    mockError(422, {
      message: 'Validation failed',
      errors: { email: ['Email is required'] },
    });

    try {
      await apiClient.post('/users', { name: 'Test' });
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      const apiError = error as ApiClientError;
      expect(apiError.status).toBe(422);
      expect(apiError.message).toBe('Validation failed');
      expect(apiError.errors).toEqual({ email: ['Email is required'] });
    }
  });

  it('returns network error when no response object', async () => {
    mockHandlers.push({ error: {} });

    try {
      await apiClient.get('/test');
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      const apiError = error as ApiClientError;
      expect(apiError.status).toBe(0);
      expect(apiError.message).toBe('Network error');
    }
  });
});
