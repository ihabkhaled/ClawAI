import { render, screen, within } from '@testing-library/react';
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
    firstName: null,
    lastName: null,
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
    weeklyTokenQuota: null,
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

const ORDINARY_ACTOR = { id: 'admin-2', isSuperAdmin: false };
const SUPER_ADMIN_ACTOR = { id: 'super-1', isSuperAdmin: true };

const baseProps = {
  plans: [makePlan()],
  actor: ORDINARY_ACTOR,
  pendingId: null,
  onChangeRole: vi.fn(),
  onDeactivate: vi.fn(),
  onReactivate: vi.fn(),
  onActivate: vi.fn(),
  isActivatePending: false,
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
  it('edits name and username through the dialog and saves once', async () => {
    const onUpdateUser = vi.fn();
    render(<UserTable users={[makeUser()]} {...baseProps} onUpdateUser={onUpdateUser} />);

    await userEvent.click(
      screen.getAllByRole('button', { name: 'admin.editUser' })[0] as HTMLElement,
    );

    const username = screen.getByLabelText('admin.editUserUsername');
    await userEvent.clear(username);
    await userEvent.type(username, 'renamed');
    await userEvent.type(screen.getByLabelText('admin.editUserFirstName'), 'Ada');
    await userEvent.type(screen.getByLabelText('admin.editUserLastName'), 'Lovelace');

    await userEvent.click(screen.getByRole('button', { name: 'admin.editUserSave' }));

    expect(onUpdateUser).toHaveBeenCalledWith('u1', {
      username: 'renamed',
      firstName: 'Ada',
      lastName: 'Lovelace',
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

describe('UserTable temporary password action', () => {
  it('wraps mobile actions into a two-column grid without overflowing the card', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);

    const mobileAction = screen
      .getAllByRole('button', { name: 'admin.issueTemporaryPassword' })
      .find((button) => button.closest('.touch\\:block'));
    expect(mobileAction?.parentElement).toHaveClass(
      'touch:grid',
      'touch:grid-cols-2',
      'touch:w-full',
    );
    expect(mobileAction?.querySelector('span')).toHaveClass('whitespace-normal', 'text-center');
  });

  // Regression: the "sm" button size fixes a 36px height (44px on mobile via
  // min-height), which does not grow for wrapped content. A long label such
  // as "Issue temporary password" then wraps to 2-3 lines that spill outside
  // the button's fixed box instead of being contained by it. `h-auto` lets
  // the button grow to fit every wrapped line so the label always renders
  // fully inside its own border at mobile widths.
  it('lets the action buttons grow to fit wrapped multi-line labels instead of clipping them', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);

    const mobileIssueButton = screen
      .getAllByRole('button', { name: 'admin.issueTemporaryPassword' })
      .find((button) => button.closest('.touch\\:block'));
    expect(mobileIssueButton).toHaveClass('h-auto');
    expect(mobileIssueButton).not.toHaveClass('h-9');

    const mobileEditButton = screen
      .getAllByRole('button', { name: 'admin.editUser' })
      .find((button) => button.closest('.touch\\:block'));
    expect(mobileEditButton).toHaveClass('h-auto');
    expect(mobileEditButton).not.toHaveClass('h-9');
  });

  it('renders the honest temporary-password label', () => {
    render(<UserTable users={[makeUser()]} {...baseProps} />);

    expect(
      screen.getAllByRole('button', { name: 'admin.issueTemporaryPassword' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('settings.changePassword')).toBeNull();
  });

  it('leaves other rows enabled while one user is pending', () => {
    render(
      <UserTable
        users={[makeUser({ id: 'u1' }), makeUser({ id: 'u2' })]}
        {...baseProps}
        pendingId="u1"
        isTemporaryPasswordPending
      />,
    );

    const buttons = screen.getAllByRole('button', { name: 'admin.issueTemporaryPassword' });
    expect(buttons.some((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(buttons.some((button) => !button.hasAttribute('disabled'))).toBe(true);
  });

  it('requires confirmation before issuing the temporary password', async () => {
    const onTemporaryPassword = vi.fn();
    render(
      <UserTable
        users={[makeUser({ id: 'u7' })]}
        {...baseProps}
        onTemporaryPassword={onTemporaryPassword}
      />,
    );

    await userEvent.click(
      screen.getAllByRole('button', { name: 'admin.issueTemporaryPassword' })[0] as HTMLElement,
    );
    expect(onTemporaryPassword).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('admin.issueTemporaryPasswordConfirmTitle'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('admin.issueTemporaryPasswordConfirmBody')).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'admin.issueTemporaryPassword' }),
    );

    expect(onTemporaryPassword).toHaveBeenCalledWith('u7');
  });

  it('locks every control on the super admin row for another administrator', () => {
    render(<UserTable users={[makeUser({ id: 'super-1', isSuperAdmin: true })]} {...baseProps} />);

    const edit = screen.getAllByRole('button', { name: 'admin.editUser' })[0] as HTMLElement;
    const rotate = screen.getAllByRole('button', {
      name: 'admin.issueTemporaryPassword',
    })[0] as HTMLElement;

    expect(edit).toBeDisabled();
    expect(rotate).toBeDisabled();
  });

  it('lets the super admin open their own row for editing, while rotation stays locked', () => {
    render(
      <UserTable
        users={[makeUser({ id: 'super-1', isSuperAdmin: true })]}
        {...baseProps}
        actor={SUPER_ADMIN_ACTOR}
      />,
    );

    const edit = screen.getAllByRole('button', { name: 'admin.editUser' })[0] as HTMLElement;
    const rotate = screen.getAllByRole('button', {
      name: 'admin.issueTemporaryPassword',
    })[0] as HTMLElement;

    expect(edit).toBeEnabled();
    expect(rotate).toBeDisabled();
  });
});
