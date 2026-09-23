import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserAppearancePreference, UserLanguagePreference, UserRole } from '@/enums';
import { useOpenGrafana } from '@/hooks/observability/use-open-grafana';
import { useAuthStore } from '@/stores/auth.store';
import type { GrafanaTab, UserProfile } from '@/types';

const mockGrant = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/auth/grafana-access.repository', () => ({
  grantGrafanaAccess: (...args: unknown[]) => mockGrant(...args),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, showToast: { apiError: (...args: unknown[]) => mockApiError(...args) } };
});

function wrapper(): (props: { children: ReactNode }) => ReactElement {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function signIn(role: UserRole): void {
  const user: UserProfile = {
    id: 'u-1',
    email: 'u@claw.local',
    username: 'u',
    role,
    permissions: [],
    mustChangePassword: false,
    languagePreference: UserLanguagePreference.EN,
    appearancePreference: UserAppearancePreference.SYSTEM,
  };
  act(() => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'a', refreshToken: 'r', user });
  });
}

function fakeTab(): GrafanaTab & { close: ReturnType<typeof vi.fn<() => void>> } {
  return { location: { href: 'about:blank' }, close: vi.fn<() => void>() };
}

describe('useOpenGrafana', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers Grafana to an admin', () => {
    signIn(UserRole.ADMIN);
    const { result } = renderHook(() => useOpenGrafana(), { wrapper: wrapper() });
    expect(result.current.canOpenGrafana).toBe(true);
  });

  // A USER is what every plan tier signs in as, free included.
  it('does not offer Grafana to a normal user', () => {
    signIn(UserRole.USER);
    const { result } = renderHook(() => useOpenGrafana(), { wrapper: wrapper() });
    expect(result.current.canOpenGrafana).toBe(false);
  });

  it('does not offer Grafana to a signed-out visitor', () => {
    const { result } = renderHook(() => useOpenGrafana(), { wrapper: wrapper() });
    expect(result.current.canOpenGrafana).toBe(false);
  });

  it('opens the tab before asking for the cookie, then points it at /grafana/', async () => {
    signIn(UserRole.ADMIN);
    const tab = fakeTab();
    const order: string[] = [];
    const opener = vi.fn(() => {
      order.push('open');
      return tab;
    });
    mockGrant.mockImplementation(async () => {
      order.push('grant');
      return { expiresAt: '2026-09-23T10:15:00.000Z' };
    });
    const { result } = renderHook(() => useOpenGrafana(opener), { wrapper: wrapper() });

    act(() => result.current.openGrafana());

    await waitFor(() => expect(tab.location.href).toBe('/grafana/'));
    expect(order).toEqual(['open', 'grant']);
    expect(tab.close).not.toHaveBeenCalled();
    expect(mockApiError).not.toHaveBeenCalled();
  });

  it('closes the empty tab and explains when the cookie is refused', async () => {
    signIn(UserRole.ADMIN);
    const tab = fakeTab();
    const refusal = new Error('Forbidden');
    mockGrant.mockRejectedValue(refusal);
    const { result } = renderHook(() => useOpenGrafana(() => tab), { wrapper: wrapper() });

    act(() => result.current.openGrafana());

    await waitFor(() => expect(tab.close).toHaveBeenCalledTimes(1));
    expect(tab.location.href).toBe('about:blank');
    expect(mockApiError).toHaveBeenCalledWith(
      refusal,
      'observability.grafana.failed',
      expect.any(Object),
    );
  });

  it('falls back to this tab when the browser blocks a new one', async () => {
    signIn(UserRole.ADMIN);
    const originalLocation = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    mockGrant.mockResolvedValue({ expiresAt: '2026-09-23T10:15:00.000Z' });
    const { result } = renderHook(() => useOpenGrafana(() => null), { wrapper: wrapper() });

    act(() => result.current.openGrafana());

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/grafana/'));
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });
});
