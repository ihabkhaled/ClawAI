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
      });
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    act(() => {
      useAuthStore.getState().clearAuth();
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
