import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveVscodeAuthorization,
  deliverVscodeAuthorization,
  getVscodeAuthorizationDetails,
} from '@/repositories/auth/vscode-authorization.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { useVscodeAuthorizationPage } from '../use-vscode-authorization-page';

vi.mock('@/repositories/auth/vscode-authorization.repository', () => ({
  getVscodeAuthorizationDetails: vi.fn(),
  approveVscodeAuthorization: vi.fn(),
  deliverVscodeAuthorization: vi.fn(),
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

describe('useVscodeAuthorizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams('requestId=req-1'));
    (getVscodeAuthorizationDetails as Mock).mockResolvedValue({
      clientName: 'VS Code',
      expiresIn: 300,
    });
  });

  it('loads the request and completes on approve', async () => {
    (approveVscodeAuthorization as Mock).mockResolvedValue({ redirectUri: 'vscode://x' });
    (deliverVscodeAuthorization as Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useVscodeAuthorizationPage(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.details?.clientName).toBe('VS Code');
    });
    act(() => {
      result.current.approve();
    });

    await waitFor(() => {
      expect(result.current.completed).toBe(true);
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it('shows a translated "try again in N minutes" on a 429', async () => {
    (approveVscodeAuthorization as Mock).mockRejectedValue(
      new ApiClientError({
        message: 'ThrottlerException: Too Many Requests',
        status: 429,
        retryAfterSeconds: 240,
      }),
    );
    const { result } = renderHook(() => useVscodeAuthorizationPage(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.details).toBeDefined();
    });

    act(() => {
      result.current.approve();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('auth.rateLimit.tryAgainInMinutes:{"minutes":4}');
    });
  });

  it('reports a missing request id without calling the API', () => {
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams());
    const { result } = renderHook(() => useVscodeAuthorizationPage(), {
      wrapper: createWrapper(),
    });

    expect(result.current.errorMessage).toBe('common.error');
    expect(getVscodeAuthorizationDetails).not.toHaveBeenCalled();
  });
});
