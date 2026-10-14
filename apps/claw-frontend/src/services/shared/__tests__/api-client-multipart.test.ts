import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { httpClient } from '@/lib/http-client';
import { apiClient } from '@/services/shared/api-client';

describe('apiClient multipart upload (real axios, stubbed network)', () => {
  it('sends a FormData as a form, not as JSON, though the client default is JSON', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = (config) => {
      seen = config;
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };
    const previous = httpClient.defaults.adapter;
    httpClient.defaults.adapter = adapter;
    try {
      const form = new FormData();
      form.append('file', new File(['zip'], 'plugin.zip'), 'plugin.zip');
      await apiClient.post('/plugins/imports/preview/upload', form);
    } finally {
      httpClient.defaults.adapter = previous;
    }

    expect(seen?.data).toBeInstanceOf(FormData);
    expect(String(seen?.headers.get('Content-Type'))).not.toContain('application/json');
  });

  it('still sends an ordinary body as JSON', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const previous = httpClient.defaults.adapter;
    httpClient.defaults.adapter = (config) => {
      seen = config;
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };
    try {
      await apiClient.post('/x', { a: 1 });
    } finally {
      httpClient.defaults.adapter = previous;
    }

    expect(seen?.data).toBe('{"a":1}');
  });
});
