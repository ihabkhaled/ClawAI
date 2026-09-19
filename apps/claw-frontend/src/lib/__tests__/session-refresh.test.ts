import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_REFRESH_LOCK } from '@/constants';
import { bearerTokenOf, refreshSession } from '@/lib/session-refresh';
import type * as UtilitiesModule from '@/utilities';

// Storage as every tab sees it; tests move it the way another tab would.
const storage = vi.hoisted(() => ({
  access: 'stale-access' as string | null,
  refresh: 'r1' as string | null,
}));
const setTokensMock = vi.hoisted(() => vi.fn());

vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof UtilitiesModule>();
  return {
    ...actual,
    getAccessToken: () => storage.access,
    getRefreshToken: () => storage.refresh,
    setTokens: (access: string, refresh: string) => {
      setTokensMock(access, refresh);
      storage.access = access;
      storage.refresh = refresh;
    },
  };
});

function refreshed(access: string, refresh: string): { data: unknown } {
  return { data: { tokens: { accessToken: access, refreshToken: refresh } } };
}

function httpError(status: number): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('failed', String(status), { headers }, null, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data: {},
  });
}

describe('refreshSession', () => {
  let post: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    storage.access = 'stale-access';
    storage.refresh = 'r1';
    setTokensMock.mockClear();
    post = vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    post.mockRestore();
  });

  it('spends the refresh token once for every 401 that arrives together', async () => {
    post.mockResolvedValue(refreshed('fresh-access', 'r2'));

    const results = await Promise.all([
      refreshSession('stale-access'),
      refreshSession('stale-access'),
      refreshSession('stale-access'),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['fresh-access', 'fresh-access', 'fresh-access']);
    expect(setTokensMock).toHaveBeenCalledWith('fresh-access', 'r2');
  });

  // The two-tab case: the other tab refreshed first, so storage already holds
  // a newer token. Refreshing again would spend the old refresh token twice.
  it('uses the token another tab already got instead of refreshing', async () => {
    storage.access = 'from-other-tab';

    await expect(refreshSession('stale-access')).resolves.toBe('from-other-tab');
    expect(post).not.toHaveBeenCalled();
  });

  it('refreshes one tab at a time through the Web Locks API', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    post.mockResolvedValue(refreshed('fresh-access', 'r2'));

    await refreshSession('stale-access');

    expect(request).toHaveBeenCalledWith(AUTH_REFRESH_LOCK, expect.any(Function));
    vi.unstubAllGlobals();
  });

  it.each([401, 400, 403])(
    'ends the session when the refresh is refused with %i',
    async (status) => {
      post.mockRejectedValue(httpError(status));

      await expect(refreshSession('stale-access')).resolves.toBeNull();
    },
  );

  // Offline after sleep, a 5xx, a timeout: none of them say the session is over.
  it.each([
    ['offline', new AxiosError('Network Error', 'ERR_NETWORK')],
    ['a 502', httpError(502)],
    ['rate limited', httpError(429)],
  ])('keeps the session when the refresh fails because %s', async (_label, failure) => {
    post.mockRejectedValue(failure);

    await expect(refreshSession('stale-access')).rejects.toBe(failure);
    expect(storage.refresh).toBe('r1');
  });

  // The user signed in again in another tab while this refresh was failing.
  it('adopts a login another tab made while this refresh was refused', async () => {
    post.mockImplementation(() => {
      storage.access = 'new-login-access';
      storage.refresh = 'new-login-refresh';
      return Promise.reject(httpError(401));
    });

    await expect(refreshSession('stale-access')).resolves.toBe('new-login-access');
  });

  it('reports an ended session when there is no refresh token at all', async () => {
    storage.refresh = null;

    await expect(refreshSession('stale-access')).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('bearerTokenOf', () => {
  it.each([
    ['Bearer abc.def', 'abc.def'],
    ['Basic abc', null],
    [undefined, null],
    [42, null],
  ])('%j → %j', (header, expected) => {
    expect(bearerTokenOf(header)).toBe(expected);
  });
});
