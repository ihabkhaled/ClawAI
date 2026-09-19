import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';
import type { UserProfile } from '@/types';

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'claw-admin',
  role: 'ADMIN' as UserProfile['role'],
  mustChangePassword: false,
  languagePreference: 'EN' as UserProfile['languagePreference'],
  appearancePreference: 'SYSTEM' as UserProfile['appearancePreference'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('has null tokens and user in initial state', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setAuth sets tokens, user, and isAuthenticated', () => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        user: mockUser,
        persistent: true,
      });
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearAuth resets to initial state', () => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        user: mockUser,
        persistent: true,
      });
    });

    act(() => {
      useAuthStore.getState().clearAuth();
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setUser updates only the user', () => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        user: mockUser,
        persistent: true,
      });
    });

    const updatedUser: UserProfile = { ...mockUser, username: 'updated-user' };
    act(() => {
      useAuthStore.getState().setUser(updatedUser);
    });

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('updated-user');
    expect(state.accessToken).toBe('access-123');
  });

  it('setTokens updates only tokens', () => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: mockUser,
        persistent: true,
      });
    });

    act(() => {
      useAuthStore.getState().setTokens({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.user).toEqual(mockUser);
  });

  it('isAuthenticated is true after setAuth and false after clearAuth', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: mockUser,
        persistent: true,
      });
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    act(() => {
      useAuthStore.getState().clearAuth();
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// Every tab shares localStorage. These are the multi-tab sign-out bugs of
// ADR-106, reproduced live on 2026-09-19, one test each.
describe('useAuthStore across tabs', () => {
  const KEY = 'claw-auth-storage';
  const writeFromOtherTab = (state: Record<string, unknown>): string => {
    const value = JSON.stringify({ state, version: 0 });
    localStorage.setItem(KEY, value);
    return value;
  };
  const stored = (): Record<string, unknown> =>
    (JSON.parse(localStorage.getItem(KEY) ?? '{}') as { state: Record<string, unknown> }).state;

  beforeEach(() => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'tab-b-old-access',
        refreshToken: 'tab-b-old-refresh',
        user: mockUser,
        persistent: true,
      });
    });
    document.cookie = 'claw-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('never writes its stale tokens over a refresh another tab made', () => {
    writeFromOtherTab({
      accessToken: 'tab-a-new',
      refreshToken: 'tab-a-refresh',
      user: mockUser,
      isAuthenticated: true,
      persistent: true,
    });

    act(() => {
      useAuthStore.getState().setUser({ ...mockUser, username: 'refetched' });
    });

    expect(stored()).toMatchObject({ accessToken: 'tab-a-new', refreshToken: 'tab-a-refresh' });
    expect(useAuthStore.getState().refreshToken).toBe('tab-a-refresh');
    expect(useAuthStore.getState().user?.username).toBe('refetched');
  });

  it('follows another tab that signed out instead of resurrecting the session', () => {
    localStorage.removeItem(KEY);

    act(() => {
      useAuthStore.getState().setUser(mockUser);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(stored()).toMatchObject({ accessToken: null, refreshToken: null });
  });

  it('picks up a login or refresh from another tab as it happens', async () => {
    const value = writeFromOtherTab({
      accessToken: 'tab-a-login',
      refreshToken: 'tab-a-r',
      user: mockUser,
      isAuthenticated: true,
      persistent: true,
    });

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: value }));
      await Promise.resolve();
    });

    expect(useAuthStore.getState().accessToken).toBe('tab-a-login');
  });

  it('signs this tab out when another tab signs out', () => {
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  // "Remember me" off: the marker cookie dies with the browser, and so does the session.
  it('ends a remember-me-off session when the browser was closed', async () => {
    writeFromOtherTab({
      accessToken: 'a',
      refreshToken: 'r',
      user: mockUser,
      isAuthenticated: true,
      persistent: false,
    });

    await act(async () => {
      await useAuthStore.persist.rehydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('keeps a remember-me-off session while the browser stays open', async () => {
    document.cookie = 'claw-auth-token=1; path=/';
    writeFromOtherTab({
      accessToken: 'a',
      refreshToken: 'r',
      user: mockUser,
      isAuthenticated: true,
      persistent: false,
    });

    await act(async () => {
      await useAuthStore.persist.rehydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps a remembered session after the browser was closed', async () => {
    writeFromOtherTab({
      accessToken: 'a',
      refreshToken: 'r',
      user: mockUser,
      isAuthenticated: true,
      persistent: true,
    });

    await act(async () => {
      await useAuthStore.persist.rehydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(document.cookie).toContain('claw-auth-token=1');
  });
});
