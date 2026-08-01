import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserTable } from '@/components/admin/user-table';
import { PlanLifecycleStatus } from '@/enums';
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
    lifecycleStatus: PlanLifecycleStatus.ACTIVE,
    replacementPlanId: null,
    retiredAt: null,
    dailyTokenQuota: 100000,
    monthlyTokenQuota: null,
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

// UserTable now uses the responsive DataTable wrapper which mounts BOTH
// the mobile-card and desktop-table representations in the DOM (CSS
// toggles visibility). In jsdom CSS is not applied, so every element
// appears twice — tests therefore assert on `getAllByX` and verify
// presence rather than uniqueness.

describe('UserTable plan column', () => {
  it('renders the plan column header', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);
    expect(screen.getAllByText('admin.planColumn').length).toBeGreaterThan(0);
  });

  it('shows the noPlan placeholder when the user has no active plan', () => {
    render(<UserTable users={[makeUser({ activePlanId: null })]} {...baseProps} />);
    expect(screen.getAllByText('admin.noPlan').length).toBeGreaterThan(0);
  });

  it('shows the current plan name when the user is assigned a plan', () => {
    render(<UserTable users={[makeUser({ activePlanId: 'pl1' })]} {...baseProps} />);
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('exposes the plan select trigger with an assign-plan aria-label', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);
    expect(screen.getAllByRole('combobox', { name: 'admin.assignPlan' }).length).toBeGreaterThan(0);
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
    const selects = screen.getAllByRole('combobox', { name: 'admin.assignPlan' });
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(select).toBeDisabled();
    }
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
    const selects = screen.getAllByRole('combobox', { name: 'admin.assignPlan' });
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) {
      expect(select).not.toBeDisabled();
    }
  });
});
