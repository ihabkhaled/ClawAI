import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserTable } from '@/components/admin/user-table';
import type { AdminUser } from '@/types/audit.types';
import type { PlanView } from '@/types/plan.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'alice@example.com',
    username: 'alice',
    role: 'OPERATOR',
    status: 'ACTIVE',
    createdAt: '2026-05-01T00:00:00.000Z',
    activePlanId: null,
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanView> = {}): PlanView {
  return {
    id: 'pl1',
    name: 'Pro',
    slug: 'pro',
    description: null,
    priceMonthly: null,
    priceYearly: null,
    currency: null,
    displayOrder: 1,
    isDefault: false,
    isActive: true,
    isPublic: true,
    dailyTokenQuota: 100000,
    monthlyTokenQuota: null,
    maxChatsPerDay: null,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: null,
    maxContextPacks: null,
    maxMemoryItems: null,
    allowCompareMode: true,
    allowJudgeMode: true,
    allowWorkspaces: true,
    allowMemory: true,
    allowContextPacks: true,
    modelAccess: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

const baseProps = {
  plans: [makePlan()],
  pendingId: null,
  onChangeRole: vi.fn(),
  onDeactivate: vi.fn(),
  onAssignPlan: vi.fn(),
  isRoleChangePending: false,
  isDeactivatePending: false,
  isAssignPlanPending: false,
};

describe('UserTable plan column', () => {
  it('renders the plan column header', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);
    expect(screen.getByText('admin.planColumn')).toBeInTheDocument();
  });

  it('shows the noPlan placeholder when the user has no active plan', () => {
    render(<UserTable users={[makeUser({ activePlanId: null })]} {...baseProps} />);
    expect(screen.getByText('admin.noPlan')).toBeInTheDocument();
  });

  it('shows the current plan name when the user is assigned a plan', () => {
    render(<UserTable users={[makeUser({ activePlanId: 'pl1' })]} {...baseProps} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('exposes the plan select trigger with an assign-plan aria-label', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);
    expect(screen.getByRole('combobox', { name: 'admin.assignPlan' })).toBeInTheDocument();
  });

  it('disables the plan select for the row that is pending assignment', () => {
    render(
      <UserTable
        users={[makeUser({ id: 'u1' })]}
        {...baseProps}
        pendingId="u1"
        isAssignPlanPending
      />,
    );
    expect(screen.getByRole('combobox', { name: 'admin.assignPlan' })).toBeDisabled();
  });

  it('does not disable the plan select for a different pending row', () => {
    render(
      <UserTable
        users={[makeUser({ id: 'u1' })]}
        {...baseProps}
        pendingId="other"
        isAssignPlanPending
      />,
    );
    expect(screen.getByRole('combobox', { name: 'admin.assignPlan' })).not.toBeDisabled();
  });
});
