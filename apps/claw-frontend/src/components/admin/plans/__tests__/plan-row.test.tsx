import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlanRow } from '@/components/admin/plans/plan-row';
import { PlanLifecycleStatus } from '@/enums';
import type { PlanView } from '@/types';

function makePlan(overrides: Partial<PlanView> = {}): PlanView {
  return {
    id: 'pl1',
    name: 'Pro',
    slug: 'pro',
    description: 'Pro tier',
    priceMonthly: 19,
    priceYearly: 190,
    currency: 'USD',
    displayOrder: 1,
    isDefault: false,
    isActive: true,
    isPublic: true,
    isTrial: false,
    trialDurationDays: null,
    lifecycleStatus: PlanLifecycleStatus.ACTIVE,
    replacementPlanId: null,
    retiredAt: null,
    dailyTokenQuota: 100000,
    monthlyTokenQuota: 2000000,
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
    ...overrides,
  };
}

const baseProps = {
  pendingId: null,
  onActivate: vi.fn(),
  onDeactivate: vi.fn(),
  onSetDefault: vi.fn(),
  onRetire: vi.fn(),
  onEditHref: '/admin/plans/pl1/edit',
  onModelAccessHref: '/admin/plans/pl1/model-access',
  onPricesHref: '/admin/plans/pl1/prices',
  t: (key: string) => key,
};

describe('PlanRow', () => {
  it('renders name, slug and active status; shows deactivate for active plans', () => {
    render(<PlanRow plan={makePlan({ isActive: true })} {...baseProps} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('pro')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.statusActive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'adminPlans.deactivate' })).toBeInTheDocument();
  });

  it('shows the default badge and hides the set-default button for the default plan', () => {
    render(<PlanRow plan={makePlan({ isDefault: true })} {...baseProps} />);
    expect(screen.getByText('adminPlans.defaultBadge')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'adminPlans.setDefault' })).not.toBeInTheDocument();
  });

  it('shows the private badge and activate button for an inactive private plan', () => {
    render(<PlanRow plan={makePlan({ isActive: false, isPublic: false })} {...baseProps} />);
    expect(screen.getByText('adminPlans.privateBadge')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.statusInactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'adminPlans.activate' })).toBeInTheDocument();
  });

  it('omits the description paragraph when description is null', () => {
    render(<PlanRow plan={makePlan({ description: null })} {...baseProps} />);
    expect(screen.queryByText('Pro tier')).not.toBeInTheDocument();
  });

  it('invokes onDeactivate / onSetDefault with the plan id', async () => {
    const onDeactivate = vi.fn();
    const onSetDefault = vi.fn();
    const user = userEvent.setup();
    render(
      <PlanRow
        plan={makePlan({ isActive: true, isDefault: false })}
        {...baseProps}
        onDeactivate={onDeactivate}
        onSetDefault={onSetDefault}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'adminPlans.deactivate' }));
    expect(onDeactivate).toHaveBeenCalledWith('pl1');
    await user.click(screen.getByRole('button', { name: 'adminPlans.setDefault' }));
    expect(onSetDefault).toHaveBeenCalledWith('pl1');
  });

  it('disables action buttons while the row is pending', () => {
    render(<PlanRow plan={makePlan({ isActive: true })} {...baseProps} pendingId="pl1" />);
    expect(screen.getByRole('button', { name: 'adminPlans.deactivate' })).toBeDisabled();
  });

  it('offers permanent removal only for a non-default plan', async () => {
    const onRetire = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<PlanRow plan={makePlan()} {...baseProps} onRetire={onRetire} />);
    await user.click(screen.getByRole('button', { name: 'common.delete' }));
    expect(onRetire).toHaveBeenCalledWith('pl1', 'Pro');

    rerender(<PlanRow plan={makePlan({ isDefault: true })} {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument();
  });
});
