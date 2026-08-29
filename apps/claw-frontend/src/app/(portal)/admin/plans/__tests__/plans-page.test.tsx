import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminPlansPage from '@/app/(portal)/admin/plans/page';
import { PlanLifecycleStatus } from '@/enums';
import type { PlanView, UsePlansPageResult } from '@/types';

const mockHook = vi.fn();

vi.mock('@/hooks/plans/use-plans-page', () => ({
  usePlansPage: () => mockHook(),
}));

const samplePlan = {
  id: 'pl1',
  name: 'Pro',
  slug: 'pro',
  description: null,
  priceMonthly: null,
  priceYearly: null,
  currency: 'USD',
  displayOrder: 0,
  isDefault: false,
  isPopular: false,
  isActive: true,
  isPublic: true,
  isTrial: false,
  trialDurationDays: null,
  lifecycleStatus: PlanLifecycleStatus.ACTIVE,
  replacementPlanId: null,
  retiredAt: null,
  dailyTokenQuota: 100000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: null,
  monthlyProviderCostCeilingMicroUsd: null,
  paygCreditPercentBps: 3000,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: null,
  maxContextPacks: null,
  maxMemoryItems: null,
  allowCompareMode: true,
  allowJudgeMode: true,
  allowResearchMode: false,
  allowCriticReview: false,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: true,
  allowConsensusMode: true,
  allowEscalationChain: false,
  allowRepairLab: false,
  allowTaskDecomposer: true,
  allowBestOfN: true,
  allowVerifier: false,
  allowPipelineLab: false,
  allowCostEnsemble: false,
  allowRolePack: false,
  modelAccess: [],
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
} satisfies PlanView;

type HookShape = UsePlansPageResult & {
  t: (key: string) => string;
  user: { id: string; role: string } | null;
};

function baseHook(overrides: Partial<HookShape> = {}): HookShape {
  return {
    t: (key: string) => key,
    user: { id: 'u1', role: 'ADMIN' },
    plans: [],
    isLoading: false,
    isError: false,
    error: null,
    pendingId: null,
    mutationError: null,
    clearMutationError: vi.fn(),
    onActivate: vi.fn(),
    onDeactivate: vi.fn(),
    onSetDefault: vi.fn(),
    retirementCandidate: null,
    onRequestRetirement: vi.fn(),
    onCancelRetirement: vi.fn(),
    onConfirmRetirement: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  } as HookShape;
}

describe('AdminPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the access-denied view for a non-admin user', () => {
    mockHook.mockReturnValue(baseHook({ user: { id: 'u2', role: 'VIEWER' } }));
    render(<AdminPlansPage />);
    expect(screen.queryByText('adminPlans.title')).not.toBeInTheDocument();
  });

  it('renders the loading state', () => {
    mockHook.mockReturnValue(baseHook({ isLoading: true }));
    render(<AdminPlansPage />);
    expect(screen.getByText('adminPlans.loading')).toBeInTheDocument();
  });

  it('renders the error state with the error message', () => {
    mockHook.mockReturnValue(baseHook({ isError: true, error: new Error('load failed') }));
    render(<AdminPlansPage />);
    expect(screen.getByText('load failed')).toBeInTheDocument();
  });

  it('renders the mutation error banner', () => {
    mockHook.mockReturnValue(baseHook({ mutationError: new Error('mutate failed') }));
    render(<AdminPlansPage />);
    expect(screen.getByText('mutate failed')).toBeInTheDocument();
  });

  it('renders the empty state when there are no plans', () => {
    mockHook.mockReturnValue(baseHook({ plans: [] }));
    render(<AdminPlansPage />);
    expect(screen.getByText('adminPlans.empty')).toBeInTheDocument();
  });

  it('renders plan rows when plans are present', () => {
    mockHook.mockReturnValue(baseHook({ plans: [samplePlan] }));
    render(<AdminPlansPage />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.queryByText('adminPlans.empty')).not.toBeInTheDocument();
  });
});
