import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Permission, PlanFeature, UserRole } from '@/enums';
import { useRoutePermissionGuard } from '@/hooks/auth/use-route-permission-guard';
import { useAuthStore } from '@/stores/auth.store';
import type { UserEntitlements, UserProfile } from '@/types';

// ---- mock next/navigation ----
let mockPathname = '/chat';

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname,
}));

// ---- mock the entitlements repository so usePlanFeatures resolves ----
const mockEntitlements = vi.fn();
vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    entitlements: (...args: unknown[]) => mockEntitlements(...args),
  },
}));

const USER_PERMISSIONS: Permission[] = [
  Permission.CHAT_USE,
  Permission.CHAT_READ_OWN,
  Permission.CHAT_DELETE_OWN,
  Permission.WORKSPACE_VIEW,
  Permission.WORKSPACE_APP_CONFIG_VIEW,
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

const entWithGates = (gates: Record<string, boolean>): UserEntitlements =>
  ({
    userId: 'u1',
    role: 'USER',
    isAdmin: false,
    permissions: [],
    plan: { id: 'p1', slug: 'free', name: 'Free', featureGates: gates },
    allowedModels: [],
    allowedProviders: [],
    quota: { dailyLimit: 1000, used: 0, remaining: 1000, unlimited: false },
  }) as unknown as UserEntitlements;

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

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

  it('allows an open route (no permission required) for a normal USER', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/chat';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredPermission).toBeNull();
    expect(result.current.requiredFeature).toBeNull();
  });

  it('blocks a gated route the USER lacks (connectors)', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/connectors';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(false);
    });
    expect(result.current.requiredPermission).toBe(Permission.ADMIN_CONNECTORS_MANAGE);
    expect(result.current.requiredFeature).toBeNull();
  });

  it('allows a gated route the USER holds the permission for', async () => {
    setUser(makeUser(UserRole.USER, [...USER_PERMISSIONS, Permission.MEMORY_USE]));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/memory';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredPermission).toBe(Permission.MEMORY_USE);
  });

  it('always allows an ADMIN, even on the most-gated route', async () => {
    setUser(makeUser(UserRole.ADMIN, []));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/admin/plans';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredPermission).toBe(Permission.ADMIN_PLANS_MANAGE);
  });

  it('blocks /chat/compare when the plan locks allowCompareMode', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({ allowCompareMode: false }));
    mockPathname = '/chat/compare';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBeNull();
    expect(result.current.requiredFeature).toBe(PlanFeature.ALLOW_COMPARE_MODE);
  });

  it('allows /chat/compare when the plan unlocks allowCompareMode', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({ allowCompareMode: true }));
    mockPathname = '/chat/compare';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredFeature).toBe(PlanFeature.ALLOW_COMPARE_MODE);
  });

  it('blocks /chat/verify for a USER who lacks ROUTER_USE', async () => {
    // Verifier Lab is now permission-gated by ROUTER_USE (parallel to the
    // other orchestration labs) — independent of the per-lane Judge / Critic
    // toggles in compare mode which keep their allowJudgeMode /
    // allowCriticReview / JUDGE_USE gates. USER_PERMISSIONS does not include
    // ROUTER_USE, so a normal user must be blocked here.
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({ allowJudgeMode: true }));
    mockPathname = '/chat/verify';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBe(Permission.ROUTER_USE);
  });

  it('allows ADMIN on /chat/compare even when no entitlements have arrived (admin bypass)', async () => {
    setUser(makeUser(UserRole.ADMIN, []));
    mockEntitlements.mockResolvedValue(entWithGates({ allowCompareMode: false }));
    mockPathname = '/chat/compare';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredFeature).toBe(PlanFeature.ALLOW_COMPARE_MODE);
  });

  it('denies everything when there is no signed-in user', () => {
    mockPathname = '/memory';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    expect(result.current.allowed).toBe(false);
    expect(result.current.requiredPermission).toBe(Permission.MEMORY_USE);
  });

  it('allows USER on /workspace (WORKSPACE_VIEW is part of the default grant)', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/workspace';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredPermission).toBe(Permission.WORKSPACE_VIEW);
  });

  it('allows USER on /workspace/app-configs (WORKSPACE_APP_CONFIG_VIEW is granted)', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/workspace/app-configs';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(true);
    });
    expect(result.current.requiredPermission).toBe(Permission.WORKSPACE_APP_CONFIG_VIEW);
  });

  it('still blocks USER on /workspace/sync-health (admin observability)', async () => {
    setUser(makeUser(UserRole.USER, USER_PERMISSIONS));
    mockEntitlements.mockResolvedValue(entWithGates({}));
    mockPathname = '/workspace/sync-health';

    const { result } = renderHook(() => useRoutePermissionGuard(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.allowed).toBe(false);
    });
    expect(result.current.requiredPermission).toBe(Permission.ADMIN_WORKSPACES_VIEW);
  });
});
