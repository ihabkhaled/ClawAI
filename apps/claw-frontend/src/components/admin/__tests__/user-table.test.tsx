import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    isSuperAdmin: false,
    emailVerifiedAt: '2026-05-01T00:00:00.000Z',
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
    isTrial: false,
    trialDurationDays: null,
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
  onReactivate: vi.fn(),
  onAssignPlan: vi.fn(),
  onUpdateUser: vi.fn(),
  onTemporaryPassword: vi.fn(),
  isRoleChangePending: false,
  isDeactivatePending: false,
  isReactivatePending: false,
  isAssignPlanPending: false,
  isUpdateUserPending: false,
  isTemporaryPasswordPending: false,
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

describe('UserTable lifecycle actions', () => {
  it('lets an administrator edit and save username and email', async () => {
    const onUpdateUser = vi.fn();
    render(<UserTable users={[makeUser()]} {...baseProps} onUpdateUser={onUpdateUser} />);

    await userEvent.click(
      screen.getAllByRole('button', { name: 'admin.editUser' })[0] as HTMLElement,
    );
    const username = screen.getAllByLabelText('admin.editUsername')[0] as HTMLInputElement;
    await userEvent.clear(username);
    await userEvent.type(username, 'renamed');
    await userEvent.click(
      screen.getAllByRole('button', { name: 'admin.saveUser' })[0] as HTMLElement,
    );

    expect(onUpdateUser).toHaveBeenCalledWith('u1', {
      username: 'renamed',
      email: 'alice@example.com',
    });
  });
  it('offers Deactivate for an active user', () => {
    render(<UserTable users={[makeUser({ status: 'ACTIVE' })]} {...baseProps} />);
    expect(screen.getAllByRole('button', { name: 'admin.deactivate' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'admin.reactivate' })).toBeNull();
  });

  // The regression this column was rewritten for: a suspended account used to
  // render a permanently disabled Deactivate button, leaving no way back from
  // the admin page at all.
  it('offers Reactivate for a suspended user instead of a dead Deactivate button', () => {
    render(<UserTable users={[makeUser({ status: 'SUSPENDED' })]} {...baseProps} />);
    const buttons = screen.getAllByRole('button', { name: 'admin.reactivate' });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).not.toBeDisabled();
    }
    expect(screen.queryByRole('button', { name: 'admin.deactivate' })).toBeNull();
  });

  // A pending account has never been suspended, so "reactivate" would be the
  // wrong verb for it — approving a signup is a different decision.
  it('keeps Deactivate for a pending user rather than offering Reactivate', () => {
    render(<UserTable users={[makeUser({ status: 'PENDING' })]} {...baseProps} />);
    expect(screen.getAllByRole('button', { name: 'admin.deactivate' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'admin.reactivate' })).toBeNull();
  });

  it('calls onReactivate with the user id', async () => {
    const onReactivate = vi.fn();
    render(
      <UserTable
        users={[makeUser({ id: 'u9', status: 'SUSPENDED' })]}
        {...baseProps}
        onReactivate={onReactivate}
      />,
    );

    const [button] = screen.getAllByRole('button', { name: 'admin.reactivate' });
    await userEvent.click(button as HTMLElement);

    expect(onReactivate).toHaveBeenCalledWith('u9');
  });

  it('calls onDeactivate with the user id', async () => {
    const onDeactivate = vi.fn();
    render(
      <UserTable
        users={[makeUser({ id: 'u9', status: 'ACTIVE' })]}
        {...baseProps}
        onDeactivate={onDeactivate}
      />,
    );

    const [button] = screen.getAllByRole('button', { name: 'admin.deactivate' });
    await userEvent.click(button as HTMLElement);

    expect(onDeactivate).toHaveBeenCalledWith('u9');
  });

  it('disables Reactivate while a reactivation is in flight', () => {
    render(
      <UserTable users={[makeUser({ status: 'SUSPENDED' })]} {...baseProps} isReactivatePending />,
    );
    for (const button of screen.getAllByRole('button', { name: 'admin.reactivate' })) {
      expect(button).toBeDisabled();
    }
  });
});
