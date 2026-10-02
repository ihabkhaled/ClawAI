import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '@/services/auth/auth.service';
import { ApiClientError } from '@/services/shared/api-client';

import { useForgotPasswordForm } from '../use-forgot-password-form';

vi.mock('@/services/auth/auth.service', () => ({
  authService: { requestPasswordReset: vi.fn() },
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

describe('useForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams());
  });

  it('should set isSuccess to true on a successful submit', async () => {
    (authService.requestPasswordReset as Mock).mockResolvedValue({ accepted: true });

    const { result } = renderHook(() => useForgotPasswordForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue('email', 'user@example.com');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should keep isSuccess false and set errorMessage when the mutation fails', async () => {
    (authService.requestPasswordReset as Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useForgotPasswordForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue('email', 'user@example.com');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBeTruthy();
    });
    expect(result.current.isSuccess).toBe(false);
  });

  it('should treat an unknown address identically to a known one', async () => {
    (authService.requestPasswordReset as Mock).mockResolvedValue({ accepted: true });

    const { result } = renderHook(() => useForgotPasswordForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue('email', 'unknown@example.com');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it('says how long to wait on a 429, and keeps the generic copy otherwise', async () => {
    (authService.requestPasswordReset as Mock).mockRejectedValue(
      new ApiClientError({
        message: 'Too many attempts',
        status: 429,
        code: 'RATE_LIMITED',
        retryAfterSeconds: 1800,
      }),
    );

    const { result } = renderHook(() => useForgotPasswordForm(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.form.setValue('email', 'user@example.com');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('auth.rateLimit.tryAgainInMinutes:{"minutes":30}');
    });
  });
});
