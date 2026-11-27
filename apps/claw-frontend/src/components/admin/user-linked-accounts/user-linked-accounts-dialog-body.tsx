'use client';

import { AlertTriangle, Users } from 'lucide-react';

import { LinkedAccountRow } from '@/components/admin/user-linked-accounts/linked-account-row';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { useAdminUserLinkedAccounts } from '@/hooks/admin/use-admin-user-linked-accounts';
import type { UserLinkedAccountsDialogBodyProps } from '@/types/admin-security-settings.types';

/**
 * Loading / error / empty / list for one user's linked accounts. Mounted with
 * `key={userId}` so reopening on another row never shows the previous user's
 * links while the new ones load.
 */
export function UserLinkedAccountsDialogBody({
  userId,
  locale,
  t,
}: UserLinkedAccountsDialogBodyProps): React.ReactElement {
  const { accounts, isLoading, isError, refetch } = useAdminUserLinkedAccounts(userId);

  if (isLoading) {
    return <LoadingSpinner label={t('adminSecurity.linkedAccounts.loading')} />;
  }
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('adminSecurity.linkedAccounts.loadFailed')}
        variant={EmptyStateVariant.Compact}
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t('adminSecurity.linkedAccounts.empty')}
        variant={EmptyStateVariant.Compact}
      />
    );
  }
  return (
    <ul
      className="divide-border max-h-[60vh] divide-y overflow-y-auto"
      data-testid="linked-accounts"
    >
      {accounts.map((account) => (
        <LinkedAccountRow key={account.id} account={account} locale={locale} t={t} />
      ))}
    </ul>
  );
}
