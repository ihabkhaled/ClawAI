import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanFeature, UserRole } from '@/enums';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useAuthStore } from '@/stores/auth.store';
import type { UserEntitlements, UserProfile } from '@/types';

const mockEntitlements = vi.fn();

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    entitlements: (...args: unknown[]) => mockEntitlements(...args),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const makeUser = (role: UserRole): UserProfile =>
  ({
    id: 'u1',
    email: 'u@x.com',
    username: 'u',
    role,
    permissions: [],
    mustChangePassword: false,
    languagePreference: 'EN',
    appearancePreference: 'SYSTEM',
  }) as unknown as UserProfile;

const setUser = (user: UserProfile): void => {
  act(() => {
    useAuthStore.getState().setAuth({
      accessToken: 'access',
      refreshToken: 'refresh',
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

describe('usePlanFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('ADMIN: has() always returns true regardless of plan featureGates', async () => {
    setUser(makeUser(UserRole.ADMIN));
    mockEntitlements.mockResolvedValue(
      entWithGates({ allowCompareMode: false, allowJudgeMode: false }),
    );

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
    });
    expect(result.current.has(PlanFeature.ALLOW_COMPARE_MODE)).toBe(true);
    expect(result.current.has(PlanFeature.ALLOW_JUDGE_MODE)).toBe(true);
    expect(result.current.has(PlanFeature.ALLOW_WORKSPACES)).toBe(true);
  });

  it('member with allowCompareMode=true → has(ALLOW_COMPARE_MODE) === true', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue(
      entWithGates({ allowCompareMode: true, allowJudgeMode: false }),
    );

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_COMPARE_MODE)).toBe(true);
    expect(result.current.has(PlanFeature.ALLOW_JUDGE_MODE)).toBe(false);
  });

  it('member with allowCompareMode=false → has(ALLOW_COMPARE_MODE) === false', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue(entWithGates({ allowCompareMode: false }));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_COMPARE_MODE)).toBe(false);
  });

  it('member whose plan has no featureGates entry → has() === false', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue(entWithGates({}));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_COMPARE_MODE)).toBe(false);
    expect(result.current.has(PlanFeature.ALLOW_JUDGE_MODE)).toBe(false);
  });

  it('member with no plan attached → has() === false', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue({
      userId: 'u1',
      role: 'USER',
      isAdmin: false,
      permissions: [],
      plan: null,
      allowedModels: [],
      allowedProviders: [],
      quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false },
    } as unknown as UserEntitlements);

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_COMPARE_MODE)).toBe(false);
  });

  it('propagates isLoading from the entitlements query', () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('member with allowResearchMode=true → has(ALLOW_RESEARCH_MODE) === true', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue(entWithGates({ allowResearchMode: true }));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_RESEARCH_MODE)).toBe(true);
  });

  it('member with allowResearchMode=false → has(ALLOW_RESEARCH_MODE) === false', async () => {
    setUser(makeUser(UserRole.USER));
    mockEntitlements.mockResolvedValue(entWithGates({ allowResearchMode: false }));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.has(PlanFeature.ALLOW_RESEARCH_MODE)).toBe(false);
  });

  it('ADMIN: has(ALLOW_RESEARCH_MODE) === true even when plan locks it', async () => {
    setUser(makeUser(UserRole.ADMIN));
    mockEntitlements.mockResolvedValue(entWithGates({ allowResearchMode: false }));

    const { result } = renderHook(() => usePlanFeatures(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
    });
    expect(result.current.has(PlanFeature.ALLOW_RESEARCH_MODE)).toBe(true);
  });
});
