import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlanPage from '@/app/(portal)/plan/page';
import type { UseEntitlementsResult, UserEntitlements } from '@/types';

const mockHook = vi.fn();

vi.mock('@/hooks/plans/use-plan-page', () => ({
  usePlanPage: () => mockHook(),
}));

const sampleEntitlements = {
  userId: 'u1',
  role: 'VIEWER',
  isAdmin: false,
  permissions: [],
  plan: {
    id: 'pl1',
    slug: 'pro',
    name: 'Pro',
    limits: {
      dailyTokens: 1000,
      weeklyTokens: 5000,
      monthlyTokens: 20_000,
      chatsPerDay: 10,
    },
    featureGates: {
      allowCompareMode: true,
      allowJudgeMode: false,
      allowWorkspaces: true,
      allowMemory: true,
      allowContextPacks: false,
    },
  },
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 1000, used: 250, remaining: 750, unlimited: false },
} as unknown as UserEntitlements;

type HookShape = UseEntitlementsResult & { t: (key: string) => string };

function baseHook(overrides: Partial<HookShape> = {}): HookShape {
  return {
    t: (key: string) => key,
    entitlements: null,
    isLoading: false,
    isError: false,
    error: null,
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe('PlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state', () => {
    mockHook.mockReturnValue(baseHook({ isLoading: true }));
    render(<PlanPage />);
    expect(screen.getByText('userPlan.loading')).toBeInTheDocument();
  });

  it('renders the error state with message', () => {
    mockHook.mockReturnValue(baseHook({ isError: true, error: new Error('boom') }));
    render(<PlanPage />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders the empty state when entitlements are null', () => {
    mockHook.mockReturnValue(baseHook({ entitlements: null }));
    render(<PlanPage />);
    expect(screen.getByText('userPlan.empty')).toBeInTheDocument();
  });

  it('renders the plan card and allowed models when a plan is present', () => {
    mockHook.mockReturnValue(baseHook({ entitlements: sampleEntitlements }));
    render(<PlanPage />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('userPlan.allowedModels')).toBeInTheDocument();
  });

  it('renders the no-plan card when the plan is null', () => {
    mockHook.mockReturnValue(
      baseHook({ entitlements: { ...sampleEntitlements, plan: null } as UserEntitlements }),
    );
    render(<PlanPage />);
    expect(screen.getByText('userPlan.noPlanTitle')).toBeInTheDocument();
  });
});
