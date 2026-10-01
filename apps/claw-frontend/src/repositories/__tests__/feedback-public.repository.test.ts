import { FeedbackType } from '@claw/shared-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { feedbackPublicRepository } from '@/repositories/feedback/feedback-public.repository';
import { ApiClientError } from '@/services/shared/api-client';
import { useAuthStore } from '@/stores/auth.store';

const payload = {
  type: FeedbackType.GENERAL_FEEDBACK,
  message: 'Nice',
  name: 'Ada',
  email: 'ada@example.com',
  pageUrl: 'https://claw.local/en',
  locale: 'en',
  website: '',
};

describe('feedbackPublicRepository', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts JSON to the public route with no Authorization header and no credentials', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'secret', refreshToken: 'r' });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'f1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await feedbackPublicRepository.create(payload);

    expect(result).toEqual({ id: 'f1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/feedback/public');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(JSON.stringify(init.headers).toLowerCase()).not.toContain('authorization');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('rejects with the HTTP status so the caller can tell 429 from 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const error: unknown = await feedbackPublicRepository.create(payload).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).status).toBe(429);
  });
});
