'use client';

import { Badge } from '@/components/ui/badge';
import type { LinkedAccountRowProps } from '@/types/admin-security-settings.types';
import { resolveLinkedAccountReasonKeys } from '@/utilities/admin-linked-accounts.utility';
import { formatAdminTimestamp } from '@/utilities/admin-user-management.utility';

/** One linked account: address, state, when it registered, and why it is linked. */
export function LinkedAccountRow({
  account,
  locale,
  t,
}: LinkedAccountRowProps): React.ReactElement {
  return (
    <li className="space-y-2 py-3" data-testid={`linked-account-${account.id}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 text-sm font-medium break-all">{account.email}</span>
        <Badge variant="outline">{account.status}</Badge>
        {account.bannedAt === null ? null : (
          <Badge variant="destructive">{t('adminSecurity.linkedAccounts.banned')}</Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {t('adminSecurity.linkedAccounts.registered', {
          date: formatAdminTimestamp(account.createdAt, locale),
        })}
      </p>
      <div className="flex flex-wrap gap-1">
        {resolveLinkedAccountReasonKeys(account.reasons).map((key) => (
          <Badge key={key} variant="secondary">
            {t(key)}
          </Badge>
        ))}
      </div>
    </li>
  );
}
