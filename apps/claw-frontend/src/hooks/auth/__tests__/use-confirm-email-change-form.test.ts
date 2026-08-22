import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { useConfirmEmailChangeForm } from '@/hooks/auth/use-confirm-email-change-form';
import { useTranslation } from '@/lib/i18n';
import { emailChangeService } from '@/services/auth/email-change.service';
import { logger } from '@/utilities';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('@/services/auth/email-change.service', () => ({
  emailChangeService: {
    confirm: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: vi.fn(),
}));

vi.mock('@/utilities', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockEmailChangeServiceConfirm = vi.mocked(emailChangeService.confirm);
const mockUseTranslation = vi.mocked(useTranslation);
const mockLoggerError = vi.mocked(logger.error);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useConfirmEmailChangeForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
      locale: Locale.EN,
      dir: Direction.LTR,
    });
  });

  it('should set isInvalidToken to true when token is absent', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isInvalidToken).toBe(true);
  });

  it('should set isInvalidToken to false when token is present', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isInvalidToken).toBe(false);
  });

  it('should set isSuccess to true on successful confirmation', async () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as unknown as ReturnType<typeof useSearchParams>);
    mockEmailChangeServiceConfirm.mockResolvedValue({ changed: true });

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;
    result.current.onSubmit(mockEvent);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.errorMessage).toBeNull();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should set errorMessage when confirmation returns changed: false', async () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('invalid-token'),
    } as unknown as ReturnType<typeof useSearchParams>);
    mockEmailChangeServiceConfirm.mockResolvedValue({ changed: false });

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    result.current.onSubmit({
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>);

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('auth.confirmEmailChangeInvalidToken'),
    );
    expect(result.current.isSuccess).toBe(false);
  });

  it('should set errorMessage and log on rejected confirmation', async () => {
    const error = new Error('Network Error');
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as unknown as ReturnType<typeof useSearchParams>);
    mockEmailChangeServiceConfirm.mockRejectedValue(error);

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    result.current.onSubmit({
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>);

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('auth.confirmEmailChangeInvalidToken'),
    );
    expect(result.current.isError).toBe(true);
    expect(mockLoggerError).toHaveBeenCalledWith({
      component: 'auth',
      action: 'confirm-email-change-error',
      message: 'Email change confirmation failed',
    });
  });

  it('should not call the service on submit when token is missing', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { result } = renderHook(() => useConfirmEmailChangeForm(), {
      wrapper: createWrapper(),
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;
    result.current.onSubmit(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEmailChangeServiceConfirm).not.toHaveBeenCalled();
  });
});
