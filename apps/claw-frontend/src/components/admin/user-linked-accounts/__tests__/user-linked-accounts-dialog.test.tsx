import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserLinkedAccountsDialog } from '@/components/admin/user-linked-accounts/user-linked-accounts-dialog';
import { PresenceState } from '@/enums';
import { LinkedAccountReason } from '@/enums/linked-account-reason.enum';
import type { AdminUser } from '@/types/audit.types';

const mocks = vi.hoisted(() => ({ getLinkedAccounts: vi.fn() }));

// DialogContent's own close control reads the locale.
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/repositories/admin/user-linked-accounts.repository', () => ({
  userLinkedAccountsRepository: { getLinkedAccounts: mocks.getLinkedAccounts },
}));

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}|${JSON.stringify(params)}`;

const USER: AdminUser = {
  id: 'u1',
  email: 'ada@claw.local',
  username: 'ada',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2026-11-27T00:00:00.000Z',
  activePlanId: null,
  isSuperAdmin: false,
  emailVerifiedAt: null,
  firstName: 'Ada',
  lastName: 'K',
  phone: null,
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
};

function renderDialog(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UserLinkedAccountsDialog open user={USER} locale="en" onClose={vi.fn()} t={t} />
    </QueryClientProvider>,
  );
}

describe('UserLinkedAccountsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists each linked account with why it is linked and whether it is banned', async () => {
    mocks.getLinkedAccounts.mockResolvedValue({
      accounts: [
        {
          id: 'u2',
          email: 'farm1@euploading.com',
          status: 'ACTIVE',
          bannedAt: null,
          createdAt: '2026-11-26T10:00:00.000Z',
          reasons: [LinkedAccountReason.DEVICE, LinkedAccountReason.REGISTRATION_IP],
        },
        {
          id: 'u3',
          email: 'farm2@uberip.com',
          status: 'SUSPENDED',
          bannedAt: '2026-11-27T08:00:00.000Z',
          createdAt: '2026-11-26T11:00:00.000Z',
          reasons: [LinkedAccountReason.DEVICE_ID, 'SOMETHING_NEW'],
        },
      ],
    });
    renderDialog();

    const first = await screen.findByTestId('linked-account-u2');
    expect(mocks.getLinkedAccounts).toHaveBeenCalledWith('u1');
    expect(within(first).getByText('farm1@euploading.com')).toBeInTheDocument();
    expect(
      within(first).getByText('adminSecurity.linkedAccounts.reasonDevice'),
    ).toBeInTheDocument();
    expect(
      within(first).getByText('adminSecurity.linkedAccounts.reasonRegistrationIp'),
    ).toBeInTheDocument();
    expect(
      within(first).queryByText('adminSecurity.linkedAccounts.banned'),
    ).not.toBeInTheDocument();

    const second = screen.getByTestId('linked-account-u3');
    expect(
      within(second).getByText('adminSecurity.linkedAccounts.reasonDeviceId'),
    ).toBeInTheDocument();
    expect(within(second).getByText('adminSecurity.linkedAccounts.banned')).toBeInTheDocument();
    // A reason this client does not know is dropped, never rendered as a raw code.
    expect(within(second).queryByText('SOMETHING_NEW')).not.toBeInTheDocument();
    expect(
      screen.getByText('adminSecurity.linkedAccounts.description|{"email":"ada@claw.local"}'),
    ).toBeInTheDocument();
  });

  it('says so when no other account shares a device or network', async () => {
    mocks.getLinkedAccounts.mockResolvedValue({ accounts: [] });
    renderDialog();
    expect(await screen.findByText('adminSecurity.linkedAccounts.empty')).toBeInTheDocument();
  });

  it('offers a retry when the lookup fails', async () => {
    mocks.getLinkedAccounts.mockRejectedValueOnce(new Error('500'));
    renderDialog();
    expect(await screen.findByText('adminSecurity.linkedAccounts.loadFailed')).toBeInTheDocument();
    mocks.getLinkedAccounts.mockResolvedValue({ accounts: [] });
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(await screen.findByText('adminSecurity.linkedAccounts.empty')).toBeInTheDocument();
  });
});
