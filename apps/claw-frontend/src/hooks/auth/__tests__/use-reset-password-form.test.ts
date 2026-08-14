import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '@/services/auth/auth.service';

import { useResetPasswordForm } from '../use-reset-password-form';

vi.mock('@/services/auth/auth.service', () => ({
  authService: { confirmPasswordReset: vi.fn() },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

describe('useResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams({ token: '[REDACTED]' }));
  });

  it('should set isSuccess to true on a successful reset', async () => {
    (authService.confirmPasswordReset as Mock).mockResolvedValue({ reset: true });

    const { result } = renderHook(() => useResetPasswordForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue('password', 'ClawReset123!');
      result.current.form.setValue('confirmPassword', 'ClawReset123!');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should set errorMessage and keep isInvalidToken false when reset is rejected', async () => {
    (authService.confirmPasswordReset as Mock).mockResolvedValue({ reset: false });

    const { result } = renderHook(() => useResetPasswordForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.form.setValue('password', 'ClawReset123!');
      result.current.form.setValue('confirmPassword', 'ClawReset123!');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBeTruthy();
    });
    expect(result.current.isInvalidToken).toBe(false);
  });

  it('should set isInvalidToken to true when no token is in the URL', () => {
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams());

    const { result } = renderHook(() => useResetPasswordForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isInvalidToken).toBe(true);
  });
});
