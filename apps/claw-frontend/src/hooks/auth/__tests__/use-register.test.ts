import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegister } from '@/hooks/auth/use-register';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  apiError: vi.fn(),
  errorToast: vi.fn(),
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
  showToast: { success: vi.fn(), apiError: mocks.apiError, error: mocks.errorToast },
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

  // The account exists but its confirmation email did not go out: the next
  // screen has to say so instead of telling the user to wait.
  it('flags a failed confirmation email for the check-email screen', async () => {
    mocks.search = '';
    mocks.register.mockResolvedValue({ user: { id: 'u1' }, verificationEmailSent: false });
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(() =>
      result.current.registerAsync({
        email: 'ada@example.com',
        password: 'Secret123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    );

    expect(mocks.push).toHaveBeenCalledWith('/check-email?email=ada%40example.com&delivery=failed');
  });

  // One error surface: the register form's inline alert. A toast repeating it
  // was the duplicate "An unexpected server error occurred" users saw twice.
  it('shows no toast when registration fails', async () => {
    mocks.register.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }));
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current
        .registerAsync({
          email: 'ada@example.com',
          password: 'Secret123!',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
        .catch(() => undefined);
    });

    expect(mocks.apiError).not.toHaveBeenCalled();
    expect(mocks.errorToast).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
