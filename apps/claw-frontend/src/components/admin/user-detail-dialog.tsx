'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { UserPresenceDot } from '@/components/admin/user-presence-dot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROUTES } from '@/constants/routes.constants';
import { PresenceState } from '@/enums/presence-state.enum';
import type { UserDetailDialogProps } from '@/types';
import { resolveAdminUserCapability } from '@/utilities/admin-user-capability.utility';
import {
  countryFlagEmoji,
  formatAdminTimestamp,
  formatAdminUserFullName,
  formatCountryLabel,
  formatRegistrationIp,
  resolvePresenceState,
} from '@/utilities/admin-user-management.utility';

/**
 * Read-only detail of one account, opened from the eye icon in the users table.
 * Everything here is admin-only data; the registration IP is personal data.
 */
export function UserDetailDialog({
  open,
  user,
  planName,
  locale,
  actor,
  onClose,
  onEdit,
  onBan,
  onUnban,
  t,
}: UserDetailDialogProps): ReactElement {
  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  const presence = resolvePresenceState(user.lastSeenAt);
  const capability = resolveAdminUserCapability(user, actor);
  const flag = countryFlagEmoji(user.registrationCountryCode);
  let banText = t('admin.detailNotBanned');
  if (user.isBanned) {
    banText =
      user.banPermanent || user.bannedUntil === null
        ? t('admin.detailBannedPermanent')
        : t('admin.detailBannedUntil', { date: formatAdminTimestamp(user.bannedUntil, locale) });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="user-detail-dialog">
        <DialogHeader>
          <DialogTitle>{t('admin.userDetailTitle')}</DialogTitle>
          <DialogDescription>{t('admin.userDetailDescription')}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('admin.detailName')}</dt>
            <dd className="font-medium">{formatAdminUserFullName(user)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.colUsername')}</dt>
            <dd className="font-medium">{user.username}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('admin.colEmail')}</dt>
            <dd className="font-medium break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailPhone')}</dt>
            <dd className="font-medium" data-testid="detail-phone">
              {user.phone ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailRegistrationIp')}</dt>
            <dd className="font-medium" data-testid="detail-registration-ip">
              {formatRegistrationIp(user.registrationIp)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('admin.detailRegistrationCountry')}</dt>
            <dd className="font-medium" data-testid="detail-registration-country">
              {flag === '' ? '' : `${flag} `}
              {formatCountryLabel(user.registrationCountryCode, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailRegisteredOn')}</dt>
            <dd className="font-medium">{formatAdminTimestamp(user.createdAt, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailLastOnline')}</dt>
            <dd className="font-medium" data-testid="detail-last-online">
              {formatAdminTimestamp(user.lastSeenAt, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailActivity')}</dt>
            <dd className="flex items-center gap-2 font-medium" data-testid="detail-activity">
              <UserPresenceDot state={presence} t={t} />
              {presence === PresenceState.ONLINE
                ? t('admin.presenceActiveNow')
                : t('admin.presenceOffline')}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailBanState')}</dt>
            <dd className="font-medium" data-testid="detail-ban-state">
              {user.isBanned ? <Badge variant="destructive">{banText}</Badge> : banText}
            </dd>
          </div>
          {user.isBanned && user.banReason !== null ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t('admin.detailBanReason')}</dt>
              <dd className="font-medium">{user.banReason}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">{t('admin.planColumn')}</dt>
            <dd className="font-medium">{planName ?? t('admin.noPlan')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.colRole')}</dt>
            <dd className="font-medium">{user.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.colStatus')}</dt>
            <dd className="font-medium">{user.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.detailMustChangePassword')}</dt>
            <dd className="font-medium">
              {user.mustChangePassword ? t('common.yes') : t('common.no')}
            </dd>
          </div>
        </dl>

        <DialogFooter className="gap-2 pt-2 sm:justify-between sm:gap-0">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={ROUTES.ADMIN_USER_SESSIONS(user.id)} data-testid="detail-sessions-link">
                {t('adminSessions.viewSessions')}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!capability.canEditProfile}
              onClick={() => onEdit(user)}
            >
              {t('admin.editUser')}
            </Button>
            {user.isBanned ? (
              <Button
                type="button"
                variant="outline"
                disabled={!capability.canBan}
                onClick={() => onUnban(user.id)}
              >
                {t('admin.unbanAction')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={!capability.canBan}
                onClick={() => onBan(user)}
              >
                {t('admin.banAction')}
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
