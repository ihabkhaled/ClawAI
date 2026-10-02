import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRepository } from '@/repositories/auth/auth.repository';
import { ApiClientError } from '@/services/shared/api-client';
import { showToast } from '@/utilities';

import { useCheckEmailPage } from '../use-check-email-page';

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: { resendVerification: vi.fn() },
}));

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useCheckEmailPage resend errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams('email=ada%40example.com'));
  });

  it('tells a rate-limited user how long to wait', async () => {
    (authRepository.resendVerification as Mock).mockRejectedValue(
      new ApiClientError({
        message: 'x',
        status: 429,
        code: 'RATE_LIMITED',
        retryAfterSeconds: 45,
      }),
    );
    const { result } = renderHook(() => useCheckEmailPage(), { wrapper: createWrapper() });

    act(() => {
      result.current.resend();
    });

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith({
        title: 'auth.rateLimit.tryAgainInOneMinute',
      });
    });
  });

  it('keeps the generic copy for any other failure', async () => {
    (authRepository.resendVerification as Mock).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCheckEmailPage(), { wrapper: createWrapper() });

    act(() => {
      result.current.resend();
    });

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith({ title: 'auth.checkEmailResendError' });
    });
  });
});
