import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, apiClient } from '@/services/shared/api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createFetchResponse(data: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

describe('apiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('makes a GET request to the correct URL', async () => {
    mockFetch.mockResolvedValueOnce(
      createFetchResponse({ id: 1, name: 'Test' }),
    );

    await apiClient.get('/users');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('adds Authorization header when token exists in localStorage', async () => {
    localStorage.setItem(
      'claw-auth-storage',
      JSON.stringify({ state: { accessToken: 'test-token-123' } }),
    );
    mockFetch.mockResolvedValueOnce(createFetchResponse({ ok: true }));

    await apiClient.get('/protected');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('does not add Authorization header when no token exists', async () => {
    mockFetch.mockResolvedValueOnce(createFetchResponse({ ok: true }));

    await apiClient.get('/public');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('sends JSON body for POST requests', async () => {
    mockFetch.mockResolvedValueOnce(createFetchResponse({ id: 1 }));
    const body = { name: 'Test', email: 'test@example.com' };

    await apiClient.post('/users', body);

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].body).toBe(JSON.stringify(body));
  });

  it('throws ApiClientError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      createFetchResponse({ message: 'Not Found', status: 404 }, 404, false),
    );

    await expect(apiClient.get('/missing')).rejects.toThrow(ApiClientError);
  });

  it('returns data and status on success', async () => {
    mockFetch.mockResolvedValueOnce(
      createFetchResponse({ id: 1, name: 'Test' }),
    );

    const result = await apiClient.get<{ id: number; name: string }>('/users');
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.status).toBe(200);
  });

  it('handles 204 No Content responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: () => Promise.reject(new Error('No body')),
    });

    const result = await apiClient.delete('/users/1');
    expect(result.status).toBe(204);
  });

  it('uses the correct base URL', async () => {
    mockFetch.mockResolvedValueOnce(createFetchResponse({}));

    await apiClient.get('/test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const url = callArgs[0];
    expect(url).toContain('/api/v1/test');
  });
});
