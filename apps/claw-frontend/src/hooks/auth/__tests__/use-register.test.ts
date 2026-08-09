import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegister } from '@/hooks/auth/use-register';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  register: vi.fn(),
  saveCredential: vi.fn(),
  search: 'returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dyearly',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/auth/auth.service', () => ({
  authService: { register: (...args: unknown[]) => mocks.register(...args) },
}));

vi.mock('@/utilities/credential-storage.utility', () => ({
  saveCredential: (...args: unknown[]) => mocks.saveCredential(...args),
}));

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { success: vi.fn(), apiError: vi.fn() },
}));

function makeWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function QueryWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.register.mockResolvedValue({ id: 'user-1' });
    mocks.saveCredential.mockResolvedValue(undefined);
    mocks.search = 'returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dyearly';
  });

  it('returns a newly registered user to the selected checkout route', async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({ email: 'buyer@example.com', password: 'Secret123!' }),
    );

    expect(mocks.push).toHaveBeenCalledWith('/billing/checkout?plan=pro&interval=yearly');
  });

  it('falls back to chat when registration receives an external return route', async () => {
    mocks.search = 'returnTo=https%3A%2F%2Fevil.example';
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({ email: 'buyer@example.com', password: 'Secret123!' }),
    );

    expect(mocks.push).toHaveBeenCalledWith('/chat');
  });
});
