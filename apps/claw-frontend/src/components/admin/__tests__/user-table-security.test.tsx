import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UserTable } from '@/components/admin/user-table';
import { PresenceState } from '@/enums';
import type { AdminUser } from '@/types/audit.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}|${JSON.stringify(params)}`,
    locale: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/auth/use-permissions', () => ({
  usePermissions: () => ({
    isAdmin: false,
    isSuperAdmin: false,
    can: () => false,
    canAny: () => false,
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
    emailVerifiedAt: null,
    firstName: 'Alice',
    lastName: 'Lee',
    phone: '+201001234567',
    registrationIp: '41.33.1.1',
    registrationCountryCode: 'EG',
    lastSeenAt: null,
    presence: PresenceState.OFFLINE,
    isBanned: false,
    banPermanent: false,
    bannedAt: null,
    bannedUntil: null,
    banReason: null,
    bannedByUserId: null,
    mustChangePassword: false,
    ...overrides,
  };
}

const security = {
  onBan: vi.fn().mockResolvedValue(true),
  onUnban: vi.fn(),
  onSetPassword: vi.fn().mockResolvedValue({}),
  isBanPending: false,
  isUnbanPending: false,
  isSetPasswordPending: false,
};

const props = {
  plans: [],
  actor: { id: 'admin-9', isSuperAdmin: false },
  pendingId: null,
  onChangeRole: vi.fn(),
  onDeactivate: vi.fn(),
  onReactivate: vi.fn(),
  onActivate: vi.fn(),
  onAssignPlan: vi.fn(),
  onUpdateUser: vi.fn(),
  onTemporaryPassword: vi.fn(),
  isRoleChangePending: false,
  isDeactivatePending: false,
  isReactivatePending: false,
  isActivatePending: false,
  isAssignPlanPending: false,
  isUpdateUserPending: false,
  isTemporaryPasswordPending: false,
  security,
};

describe('UserTable: IP, country, presence, ban (ADR-200)', () => {
  it('shows the registration IP and the country in the table', () => {
    render(<UserTable users={[makeUser()]} {...props} />);
    const cells = screen.getAllByTestId('registration-u1');
    expect(cells[0]).toHaveTextContent('41.33.1.1');
    expect(cells[0]).toHaveTextContent('Egypt (EG)');
  });

  it('shows a dash for an account with no recorded IP', () => {
    render(
      <UserTable
        users={[makeUser({ registrationIp: null, registrationCountryCode: null })]}
        {...props}
      />,
    );
    expect(screen.getAllByTestId('registration-u1')[0]).toHaveTextContent('-');
  });

  it('puts a presence dot on every row: green when seen a minute ago, grey when never', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    render(
      <UserTable
        users={[
          makeUser({ id: 'u1', lastSeenAt: recent }),
          makeUser({ id: 'u2', username: 'bob' }),
        ]}
        {...props}
      />,
    );
    const dots = screen.getAllByRole('img', { name: /admin.presence/ });
    expect(dots.some((dot) => dot.getAttribute('data-presence') === PresenceState.ONLINE)).toBe(
      true,
    );
    expect(dots.some((dot) => dot.getAttribute('data-presence') === PresenceState.OFFLINE)).toBe(
      true,
    );
  });

  it('badges a banned account', () => {
    render(<UserTable users={[makeUser({ isBanned: true, banPermanent: true })]} {...props} />);
    expect(screen.getAllByText('admin.bannedBadge').length).toBeGreaterThan(0);
  });

  it('opens the detail view from the eye icon', async () => {
    render(<UserTable users={[makeUser()]} {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'admin.viewUserDetails' })[0]!);
    const dialog = await screen.findByTestId('user-detail-dialog');
    expect(within(dialog).getByTestId('detail-registration-ip')).toHaveTextContent('41.33.1.1');
    expect(within(dialog).getByTestId('detail-phone')).toHaveTextContent('+201001234567');
  });

  it('offers Ban on an ordinary row and unbans a banned one with one click', async () => {
    const { unmount } = render(<UserTable users={[makeUser()]} {...props} />);
    expect(screen.getAllByRole('button', { name: 'admin.banAction' })[0]).toBeEnabled();
    unmount();

    render(<UserTable users={[makeUser({ isBanned: true, banPermanent: true })]} {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'admin.unbanAction' })[0]!);
    expect(security.onUnban).toHaveBeenCalledWith('u1');
  });

  it('cannot ban yourself or the super administrator from the row', () => {
    const { unmount } = render(<UserTable users={[makeUser({ id: 'admin-9' })]} {...props} />);
    expect(screen.getAllByRole('button', { name: 'admin.banAction' })[0]).toBeDisabled();
    unmount();

    render(<UserTable users={[makeUser({ id: 'super-1', isSuperAdmin: true })]} {...props} />);
    expect(screen.getAllByRole('button', { name: 'admin.banAction' })[0]).toBeDisabled();
  });

  it('opens the ban dialog from the row', async () => {
    render(<UserTable users={[makeUser()]} {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'admin.banAction' })[0]!);
    expect(await screen.findByLabelText('admin.banReason')).toBeInTheDocument();
  });
});
