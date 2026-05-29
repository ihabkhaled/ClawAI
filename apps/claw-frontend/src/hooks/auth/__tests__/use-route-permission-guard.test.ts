import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Permission, UserRole } from '@/enums';
import { useRoutePermissionGuard } from '@/hooks/auth/use-route-permission-guard';
import { useAuthStore } from '@/stores/auth.store';
import type { UserProfile } from '@/types';

// ---- mock next/navigation ----
let mockPathname = '/chat';

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname,
}));

const USER_PERMISSIONS: Permission[] = [
  Permission.CHAT_USE,
  Permission.CHAT_READ_OWN,
  Permission.CHAT_DELETE_OWN,
  Permission.WORKSPACE_CONNECT_OWN,
  Permission.WORKSPACE_READ_OWN,
  Permission.WORKSPACE_SYNC_OWN,
  Permission.WORKSPACE_ACTION_OWN,
  Permission.MODEL_USE_ALLOWED,
  Permission.AGENT_USE,
];

const makeUser = (role: UserRole, permissions: Permission[]): UserProfile =>
  ({
    id: 'u1',
    email: 'u@x.com',
    username: 'u',
    role,
    permissions,
    mustChangePassword: false,
    languagePreference: 'EN',
    appearancePreference: 'SYSTEM',
  }) as unknown as UserProfile;

const setUser = (user: UserProfile): void => {
  act(() => {
    useAuthStore.getState().setAuth({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user,
    });
  });
};

describe('useRoutePermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/chat';
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('allows an open route (no permission required) for a normal USER', () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockPathname = '/chat';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(true);
    expect(result.current.requiredPermission).toBeNull();
  });

  it('blocks a gated route the USER lacks (connectors)', () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockPathname = '/connectors';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBe(Permission.ADMIN_CONNECTORS_MANAGE);
  });

  it('blocks the dashboard for a USER who lacks VIEW_DASHBOARD', () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockPathname = '/dashboard';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBe(Permission.VIEW_DASHBOARD);
  });

  it('allows a gated route the USER holds the permission for', () => {
    setUser(makeUser(UserRole.USER, [...USER_PERMISSIONS, Permission.MEMORY_USE]));
    mockPathname = '/memory';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(true);
    expect(result.current.requiredPermission).toBe(Permission.MEMORY_USE);
  });

  it('always allows an ADMIN, even on the most-gated route', () => {
    setUser(makeUser(UserRole.ADMIN, []));
    mockPathname = '/admin/plans';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(true);
    expect(result.current.requiredPermission).toBe(Permission.ADMIN_PLANS_MANAGE);
  });

  it('denies everything when there is no signed-in user', () => {
    mockPathname = '/memory';

    const { result } = renderHook(() => useRoutePermissionGuard());

    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBe(Permission.MEMORY_USE);
  });
});
