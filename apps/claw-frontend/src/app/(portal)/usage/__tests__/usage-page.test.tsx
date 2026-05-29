import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UsagePage from '@/app/(portal)/usage/page';
import type { UseEntitlementsResult, UserEntitlements } from '@/types';

const mockHook = vi.fn();

vi.mock('@/hooks/plans/use-usage-page', () => ({
  useUsagePage: () => mockHook(),
}));

const sampleEntitlements = {
  userId: 'u1',
  role: 'VIEWER',
  isAdmin: false,
  permissions: [],
  plan: { id: 'pl1', slug: 'pro', name: 'Pro', featureGates: {} },
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

describe('UsagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state', () => {
    mockHook.mockReturnValue(baseHook({ isLoading: true }));
    render(<UsagePage />);
    expect(screen.getByText('userUsage.loading')).toBeInTheDocument();
  });

  it('renders the error state with message', () => {
    mockHook.mockReturnValue(baseHook({ isError: true, error: new Error('boom') }));
    render(<UsagePage />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders the empty state when entitlements are null', () => {
    mockHook.mockReturnValue(baseHook({ entitlements: null }));
    render(<UsagePage />);
    expect(screen.getByText('userUsage.empty')).toBeInTheDocument();
  });

  it('renders the usage card with the plan name when entitlements are present', () => {
    mockHook.mockReturnValue(baseHook({ entitlements: sampleEntitlements }));
    render(<UsagePage />);
    expect(screen.getByText('userUsage.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('userUsage.onPlan')).toBeInTheDocument();
  });

  it('renders the no-plan description when the plan is null', () => {
    mockHook.mockReturnValue(
      baseHook({ entitlements: { ...sampleEntitlements, plan: null } as UserEntitlements }),
    );
    render(<UsagePage />);
    expect(screen.getByText('userUsage.noPlan')).toBeInTheDocument();
  });
});
