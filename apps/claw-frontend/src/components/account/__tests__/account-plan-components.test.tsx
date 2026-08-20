import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AllowedModelsList } from '@/components/account/allowed-models-list';
import { PlanCard } from '@/components/account/plan-card';
import { PlanFeatureGates } from '@/components/account/plan-feature-gates';
import { UsageMeter } from '@/components/account/usage-meter';
import type {
  EntitlementFeatureGates,
  EntitlementPlan,
  EntitlementQuota,
  PlanModelAccessView,
} from '@/types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.value === undefined ? key : `${key}:${String(params.value)}`;

const gates: EntitlementFeatureGates = {
  allowCompareMode: true,
  allowJudgeMode: false,
  allowResearchMode: false,
  allowCriticReview: false,
  allowWorkspaces: true,
  allowMemory: false,
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
};

describe('UsageMeter', () => {
  it('renders the unlimited state when quota.unlimited is true', () => {
    const quota: EntitlementQuota = {
      dailyLimit: 0,
      used: 0,
      remaining: 0,
      unlimited: true,
      adminBypass: true,
    };
    render(<UsageMeter quota={quota} t={t} />);
    expect(screen.getByText('userUsage.adminBypass')).toBeInTheDocument();
    expect(screen.getByText('userUsage.adminBypassHint')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders a progress meter for a bounded quota', () => {
    const quota: EntitlementQuota = {
      dailyLimit: 1000,
      used: 250,
      remaining: 750,
      unlimited: false,
      adminBypass: false,
    };
    render(<UsageMeter quota={quota} t={t} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('PlanFeatureGates', () => {
  it('renders a row per feature gate', () => {
    render(<PlanFeatureGates featureGates={gates} t={t} />);
    expect(screen.getByText('adminPlans.gate.allowCompareMode')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.gate.allowMemory')).toBeInTheDocument();
  });
});

describe('PlanCard', () => {
  it('renders the plan name, slug and feature gates', () => {
    const plan: EntitlementPlan = {
      id: 'pl1',
      slug: 'pro',
      name: 'Pro',
      isTrial: false,
      trialEndsAt: null,
      isTrialExpired: false,
      featureGates: gates,
      limits: {
        dailyTokens: 10_000,
        weeklyTokens: 50_000,
        monthlyTokens: 200_000,
        chatsPerDay: 20,
        messagesPerDay: 250,
        workspaceConnections: 5,
        contextPacks: 10,
        memoryItems: 10,
      },
    };
    render(<PlanCard plan={plan} t={t} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('pro')).toBeInTheDocument();
    expect(screen.getByText('userPlan.featuresIncluded')).toBeInTheDocument();
    expect(screen.getByText('userPlan.planLimits')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('200,000')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getAllByText('5')).toHaveLength(1);
    expect(screen.getAllByText('10')).toHaveLength(2);
    expect(screen.getByText('adminPlans.gate.allowConsensusMode')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.gate.allowRolePack')).toBeInTheDocument();
  });
});

describe('AllowedModelsList', () => {
  it('renders the all-allowed fallback when the list is empty', () => {
    render(<AllowedModelsList models={[]} t={t} />);
    expect(screen.getByText('userPlan.allModelsAllowed')).toBeInTheDocument();
  });

  it('renders badges and override for a model entry', () => {
    const models: PlanModelAccessView[] = [
      {
        provider: 'openai',
        model: 'gpt-4o',
        isAllowed: true,
        allowAsPrimary: true,
        allowAsFallback: true,
        allowAsJudge: false,
        allowInCompare: true,
        dailyTokenLimitOverride: 5000,
      },
    ];
    render(<AllowedModelsList models={models} t={t} />);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('userPlan.modelPrimary')).toBeInTheDocument();
    expect(screen.getByText('userPlan.modelCompare')).toBeInTheDocument();
    expect(screen.getByText('userPlan.modelOverride')).toBeInTheDocument();
  });

  it('omits optional badges when flags are off and override is null', () => {
    const models: PlanModelAccessView[] = [
      {
        provider: 'ollama',
        model: 'gemma3:4b',
        isAllowed: true,
        allowAsPrimary: false,
        allowAsFallback: true,
        allowAsJudge: false,
        allowInCompare: false,
        dailyTokenLimitOverride: null,
      },
    ];
    render(<AllowedModelsList models={models} t={t} />);
    expect(screen.queryByText('userPlan.modelPrimary')).not.toBeInTheDocument();
    expect(screen.queryByText('userPlan.modelCompare')).not.toBeInTheDocument();
    expect(screen.queryByText('userPlan.modelOverride')).not.toBeInTheDocument();
  });
});
