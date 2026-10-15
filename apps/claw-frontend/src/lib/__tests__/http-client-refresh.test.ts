import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '@/lib/http-client';
import type * as UtilitiesModule from '@/utilities';

const { clearAuthStorageMock, getRefreshTokenMock } = vi.hoisted(() => ({
  clearAuthStorageMock: vi.fn(),
  getRefreshTokenMock: vi.fn((): string | null => null),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof UtilitiesModule>();
  return {
    ...actual,
    getAccessToken: () => 'expired-token',
    getRefreshToken: getRefreshTokenMock,
    setTokens: vi.fn(),
    clearAuthStorage: clearAuthStorageMock,
  };
});

/**
 * The interceptor itself, not the list it consults.
 *
 * A test that re-derives the exemption from the constant proves the constant's
 * contents and nothing else — it stays green if the interceptor stops reading
 * it. This drives the response interceptor that actually decides whether a 401
 * ends the session.
 */
function unauthorized(url: string): AxiosError {
  return {
    // Sent with the token storage still holds, so it really is the stale one.
    config: {
      url,
      headers: { Authorization: 'Bearer expired-token' },
    } as InternalAxiosRequestConfig,
    response: { status: 401 },
    isAxiosError: true,
  } as AxiosError;
}

async function handle401(url: string): Promise<void> {
  const handlers = (
    httpClient.interceptors.response as unknown as {
      handlers: Array<{ rejected?: (error: AxiosError) => Promise<unknown> }>;
    }
  ).handlers;
  const onRejected = handlers.find((handler) => handler.rejected !== undefined)?.rejected;
  if (onRejected === undefined) {
    throw new Error('no response interceptor registered');
  }
  await onRejected(unauthorized(url)).catch(() => undefined);
}

describe('http client 401 handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No refresh token, so entering the flow clears storage and redirects —
    // which makes "did it enter the flow?" observable.
    getRefreshTokenMock.mockReturnValue(null);
  });

  it('does not end the session when a telemetry batch write 401s', async () => {
    await handle401('/client-logs/batch');

    expect(clearAuthStorageMock).not.toHaveBeenCalled();
  });

  it('does end the session when a real application request 401s', async () => {
    await handle401('/chat-messages/thread/abc');

    expect(clearAuthStorageMock).toHaveBeenCalled();
  });

  it('still refreshes for the admin log-reading routes', async () => {
    // They share the telemetry prefix but are authenticated admin reads.
    await handle401('/client-logs/stats');

    expect(clearAuthStorageMock).toHaveBeenCalled();
  });

  describe('on a public page', () => {
    const originalLocation = window.location;
    const hrefSetter = vi.fn();

    beforeEach(() => {
      hrefSetter.mockClear();
    });

    function stubLocation(pathname: string): void {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          pathname,
          get href(): string {
            return pathname;
          },
          set href(value: string) {
            hrefSetter(value);
          },
        },
      });
    }

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it.each(['/en/threads/board', '/de/threads/board', '/en/threads/clear-writing'])(
      'drops a dead session quietly and never redirects (%s)',
      async (pathname) => {
        stubLocation(pathname);
        await handle401('/thread-publications/public/clear-writing/reader-view');

        expect(clearAuthStorageMock).toHaveBeenCalled();
        expect(hrefSetter).not.toHaveBeenCalled();
      },
    );

    it('still redirects from a page that needs login', async () => {
      stubLocation('/ar/settings');
      await handle401('/users/me');

      // The sign-in screen in the language of the page the session died on.
      expect(hrefSetter).toHaveBeenCalledWith('/ar/login');
    });
  });
});
