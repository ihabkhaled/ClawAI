import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BanUserDialog } from '@/components/admin/ban-user-dialog';
import { PresenceSummaryCards } from '@/components/admin/presence-summary-cards';
import { SetPasswordDialog } from '@/components/admin/set-password-dialog';
import { UserDetailDialog } from '@/components/admin/user-detail-dialog';
import { UserPresenceDot } from '@/components/admin/user-presence-dot';
import { BanDurationUnit, PasswordSetMode, PresenceFilter, PresenceState } from '@/enums';
import type { AdminUser } from '@/types/audit.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}|${JSON.stringify(params)}`;

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'ada@claw.local',
    username: 'ada',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-05-01T00:00:00.000Z',
    activePlanId: null,
    isSuperAdmin: false,
    emailVerifiedAt: null,
    firstName: 'Ada',
    lastName: 'Khaled',
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

const ADMIN = { id: 'admin-1', isSuperAdmin: false };

describe('UserPresenceDot', () => {
  it.each([
    [PresenceState.ONLINE, 'admin.presenceOnline', 'bg-success'],
    [PresenceState.RECENT, 'admin.presenceRecent', 'bg-warning'],
    [PresenceState.OFFLINE, 'admin.presenceOffline', 'bg-muted-foreground/40'],
  ])('%s is labelled and coloured', (state, label, colour) => {
    render(<UserPresenceDot state={state} t={t} />);
    const dot = screen.getByRole('img', { name: label });
    expect(dot).toHaveAttribute('data-presence', state);
    expect(dot.className).toContain(colour);
  });
});

describe('PresenceSummaryCards', () => {
  it('shows the counts', () => {
    render(
      <PresenceSummaryCards
        summary={{ onlineNow: 3, active24h: 12, bannedNow: 1 }}
        activeFilter={null}
        onSelectFilter={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('presence-online-count')).toHaveTextContent('3');
    expect(screen.getByTestId('presence-active-count')).toHaveTextContent('12');
    expect(screen.getByTestId('presence-banned-count')).toHaveTextContent('1');
  });

  it('shows dashes until the counts load', () => {
    render(
      <PresenceSummaryCards
        summary={undefined}
        activeFilter={null}
        onSelectFilter={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('presence-online-count')).toHaveTextContent('-');
  });

  it('toggles the online filter on and off', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PresenceSummaryCards
        summary={undefined}
        activeFilter={null}
        onSelectFilter={onSelect}
        t={t}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /admin.presenceOnlineNow/ }));
    expect(onSelect).toHaveBeenLastCalledWith(PresenceFilter.ONLINE);

    rerender(
      <PresenceSummaryCards
        summary={undefined}
        activeFilter={PresenceFilter.ONLINE}
        onSelectFilter={onSelect}
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: /admin.presenceOnlineNow/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: /admin.presenceOnlineNow/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('selects the 24 hour filter', async () => {
    const onSelect = vi.fn();
    render(
      <PresenceSummaryCards
        summary={undefined}
        activeFilter={null}
        onSelectFilter={onSelect}
        t={t}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /admin.presenceActive24h/ }));
    expect(onSelect).toHaveBeenCalledWith(PresenceFilter.ACTIVE_24H);
  });
});

describe('UserDetailDialog', () => {
  function renderDetail(
    user: AdminUser,
    extra: Partial<React.ComponentProps<typeof UserDetailDialog>> = {},
  ) {
    const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onBan: vi.fn(), onUnban: vi.fn() };
    render(
      <UserDetailDialog
        open
        user={user}
        planName="Pro"
        locale="en"
        actor={ADMIN}
        t={t}
        {...handlers}
        {...extra}
      />,
    );
    return handlers;
  }

  it('shows name, phone, registration IP and country, plan and not-banned state', () => {
    renderDetail(makeUser());
    expect(screen.getByText('Ada Khaled')).toBeInTheDocument();
    expect(screen.getByTestId('detail-phone')).toHaveTextContent('+201001234567');
    expect(screen.getByTestId('detail-registration-ip')).toHaveTextContent('41.33.1.1');
    expect(screen.getByTestId('detail-registration-country')).toHaveTextContent('Egypt (EG)');
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByTestId('detail-ban-state')).toHaveTextContent('admin.detailNotBanned');
  });

  it('shows Active now for a user seen within five minutes and Offline otherwise', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const { unmount } = render(
      <UserDetailDialog
        open
        user={makeUser({ lastSeenAt: recent })}
        planName={null}
        locale="en"
        actor={ADMIN}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onBan={vi.fn()}
        onUnban={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('detail-activity')).toHaveTextContent('admin.presenceActiveNow');
    unmount();

    const old = new Date(Date.now() - 3 * 3_600_000).toISOString();
    renderDetail(makeUser({ lastSeenAt: old }), { planName: null });
    expect(screen.getByTestId('detail-activity')).toHaveTextContent('admin.presenceOffline');
  });

  it('shows dashes for a missing IP, country and phone', () => {
    renderDetail(makeUser({ registrationIp: null, registrationCountryCode: null, phone: null }), {
      planName: null,
    });
    expect(screen.getByTestId('detail-registration-ip')).toHaveTextContent('-');
    expect(screen.getByTestId('detail-registration-country')).toHaveTextContent('-');
    expect(screen.getByTestId('detail-phone')).toHaveTextContent('-');
    expect(screen.getByText('admin.noPlan')).toBeInTheDocument();
  });

  it('describes a lifetime and a timed ban, with the reason', () => {
    const { unmount } = render(
      <UserDetailDialog
        open
        user={makeUser({ isBanned: true, banPermanent: true, banReason: 'spam' })}
        planName={null}
        locale="en"
        actor={ADMIN}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onBan={vi.fn()}
        onUnban={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('detail-ban-state')).toHaveTextContent('admin.detailBannedPermanent');
    expect(screen.getByText('spam')).toBeInTheDocument();
    unmount();

    renderDetail(makeUser({ isBanned: true, bannedUntil: '2026-11-05T10:00:00.000Z' }), {
      planName: null,
    });
    expect(screen.getByTestId('detail-ban-state')).toHaveTextContent('admin.detailBannedUntil');
  });

  it('offers Ban for an unbanned user and Unban for a banned one', async () => {
    const handlers = renderDetail(makeUser());
    await userEvent.click(screen.getByRole('button', { name: 'admin.banAction' }));
    expect(handlers.onBan).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }));
  });

  it('unbans from the detail view', async () => {
    const handlers = renderDetail(makeUser({ isBanned: true, banPermanent: true }));
    await userEvent.click(screen.getByRole('button', { name: 'admin.unbanAction' }));
    expect(handlers.onUnban).toHaveBeenCalledWith('u1');
  });

  it('disables ban on your own row and on the super administrator', () => {
    renderDetail(makeUser({ id: 'admin-1' }));
    expect(screen.getByRole('button', { name: 'admin.banAction' })).toBeDisabled();
  });

  it('disables ban on the super administrator for another admin', () => {
    renderDetail(makeUser({ id: 'super-1', isSuperAdmin: true }));
    expect(screen.getByRole('button', { name: 'admin.banAction' })).toBeDisabled();
  });
});

describe('BanUserDialog', () => {
  it('bans for a number of days with a reason, then closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(
      <BanUserDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={onClose}
        onConfirm={onConfirm}
        t={t}
      />,
    );
    const amount = screen.getByLabelText('admin.banAmount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '3');
    await userEvent.type(screen.getByLabelText('admin.banReason'), 'spamming');
    await userEvent.click(screen.getByRole('button', { name: 'admin.banConfirm' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('u1', {
        unit: BanDurationUnit.DAYS,
        amount: 3,
        reason: 'spamming',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('bans for life without an amount', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(
      <BanUserDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        t={t}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('admin.banUnit'), BanDurationUnit.LIFETIME);
    expect(screen.getByLabelText('admin.banAmount')).toBeDisabled();
    await userEvent.type(screen.getByLabelText('admin.banReason'), 'abuse');
    await userEvent.click(screen.getByRole('button', { name: 'admin.banConfirm' }));
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('u1', {
        unit: BanDurationUnit.LIFETIME,
        reason: 'abuse',
      }),
    );
  });

  it('refuses to submit without a reason', async () => {
    const onConfirm = vi.fn();
    render(
      <BanUserDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        t={t}
      />,
    );
    await userEvent.type(screen.getByLabelText('admin.banAmount'), '1');
    expect(screen.getByRole('button', { name: 'admin.banConfirm' })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stays open when the server refuses', async () => {
    const onClose = vi.fn();
    render(
      <BanUserDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={onClose}
        onConfirm={vi.fn().mockResolvedValue(false)}
        t={t}
      />,
    );
    await userEvent.type(screen.getByLabelText('admin.banReason'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'admin.banConfirm' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'admin.banConfirm' })).toBeEnabled(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('SetPasswordDialog', () => {
  it('generates on the server and shows the password once, with a copy button', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ generatedPassword: 'Gen3rated!Pass#word' });
    const onClose = vi.fn();
    render(
      <SetPasswordDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={onClose}
        onConfirm={onConfirm}
        t={t}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'admin.setPasswordGenerateConfirm' }));

    expect(onConfirm).toHaveBeenCalledWith('u1', { mode: PasswordSetMode.GENERATE });
    expect(await screen.findByTestId('generated-password')).toHaveTextContent(
      'Gen3rated!Pass#word',
    );
    expect(screen.getByRole('button', { name: 'admin.setPasswordCopy' })).toBeInTheDocument();
    expect(screen.getByText('admin.setPasswordGeneratedWarning')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'admin.setPasswordDone' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('sets a typed password that passes the policy', async () => {
    const onConfirm = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    render(
      <SetPasswordDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={onClose}
        onConfirm={onConfirm}
        t={t}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'admin.setPasswordModeManual' }));
    await userEvent.type(screen.getByLabelText('admin.setPasswordManualLabel'), 'New-Pass123');
    await userEvent.click(screen.getByRole('button', { name: 'admin.setPasswordConfirm' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('u1', {
        mode: PasswordSetMode.MANUAL,
        password: 'New-Pass123',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])(
    'will not submit the weak password %s',
    async (weak) => {
      const onConfirm = vi.fn();
      render(
        <SetPasswordDialog
          open
          user={makeUser()}
          isSaving={false}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          t={t}
        />,
      );
      await userEvent.click(screen.getByRole('radio', { name: 'admin.setPasswordModeManual' }));
      await userEvent.type(screen.getByLabelText('admin.setPasswordManualLabel'), weak);
      expect(screen.getByRole('button', { name: 'admin.setPasswordConfirm' })).toBeDisabled();
      expect(onConfirm).not.toHaveBeenCalled();
    },
  );

  it('keeps the dialog on the form when the server refuses', async () => {
    const onClose = vi.fn();
    render(
      <SetPasswordDialog
        open
        user={makeUser()}
        isSaving={false}
        onClose={onClose}
        onConfirm={vi.fn().mockResolvedValue(null)}
        t={t}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'admin.setPasswordGenerateConfirm' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'admin.setPasswordGenerateConfirm' }),
      ).toBeEnabled(),
    );
    expect(screen.queryByTestId('generated-password')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
