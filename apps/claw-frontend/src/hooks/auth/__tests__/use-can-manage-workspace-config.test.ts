import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Permission, UserRole } from '@/enums';
import { useCanManageWorkspaceConfig } from '@/hooks/auth/use-can-manage-workspace-config';
import { useAuthStore } from '@/stores/auth.store';
import type { UserProfile } from '@/types';

function setAuth(user: UserProfile): void {
  act(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'a',
      refreshToken: 'r',
      user,
    });
  });
}

function makeUser(role: UserRole, permissions: Permission[] = []): UserProfile {
  return {
    id: 'u-1',
    email: 'u@x.com',
    username: 'u',
    role,
    permissions,
    mustChangePassword: false,
    languagePreference: 'EN',
    appearancePreference: 'SYSTEM',
  } as unknown as UserProfile;
}

describe('useCanManageWorkspaceConfig', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('returns true for ADMIN even with no explicit permissions', () => {
    setAuth(makeUser(UserRole.ADMIN, []));
    const { result } = renderHook(() => useCanManageWorkspaceConfig());
    expect(result.current).toBe(true);
  });

  it('returns true for USER that explicitly holds ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
    setAuth(makeUser(UserRole.USER, [Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE]));
    const { result } = renderHook(() => useCanManageWorkspaceConfig());
    expect(result.current).toBe(true);
  });

  it('returns false for USER that lacks ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
    setAuth(makeUser(UserRole.USER, [Permission.CHAT_USE]));
    const { result } = renderHook(() => useCanManageWorkspaceConfig());
    expect(result.current).toBe(false);
  });

  it('returns false when no user is authenticated', () => {
    const { result } = renderHook(() => useCanManageWorkspaceConfig());
    expect(result.current).toBe(false);
  });
});
