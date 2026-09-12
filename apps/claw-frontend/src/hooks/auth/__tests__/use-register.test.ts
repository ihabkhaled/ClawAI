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

  // Registration no longer lands on /login: the account is PENDING, so a
  // sign-in there is guaranteed to fail. /check-email is the screen that
  // explains that, and it forwards the checkout returnTo so the journey the
  // user started is not lost at the new hop. See ADR-096.
  it('carries the selected checkout route through to the check-email screen', async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({
        email: 'buyer@example.com',
        password: 'Secret123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    );

    expect(mocks.push).toHaveBeenCalledWith(
      '/check-email?email=buyer%40example.com&returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dyearly',
    );
  });

  it('still refuses an external return route, sanitising it to chat', async () => {
    mocks.search = 'returnTo=https%3A%2F%2Fevil.example';
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({
        email: 'buyer@example.com',
        password: 'Secret123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    );

    expect(mocks.push).toHaveBeenCalledWith(
      '/check-email?email=buyer%40example.com&returnTo=%2Fchat',
    );
  });

  it('never sends a pending account to the sign-in form', async () => {
    mocks.search = '';
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({
        email: 'ada@example.com',
        password: 'Secret123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    );

    expect(mocks.push).toHaveBeenCalledWith('/check-email?email=ada%40example.com');
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringContaining('/login'));
  });
});
