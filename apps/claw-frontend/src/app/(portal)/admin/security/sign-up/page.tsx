'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import { SecuritySettingsGroupCard } from '@/components/admin/security/security-settings-group-card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useAdminSecuritySettingsPage } from '@/hooks/admin/use-admin-security-settings-page';

/**
 * Sign-up protection (anti-abuse, 2026-11-27): the security.* SystemSetting
 * keys. Gated on ADMIN_SYSTEM_VIEW by ROUTE_PERMISSIONS; editing additionally
 * needs the permission the settings PUT enforces (see the controller hook).
 * No rows yet is not an empty state: every field then shows its default.
 */
export default function AdminSecuritySignupPage(): ReactElement {
  const page = useAdminSecuritySettingsPage();
  let content: ReactElement;
  if (page.isLoading) {
    content = <LoadingSpinner label={page.t('adminSecurity.loading')} />;
  } else if (page.isError) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title={page.t('adminSecurity.loadFailed')}
        action={
          <Button variant="outline" onClick={page.retry}>
            {page.t('common.retry')}
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-4">
        {page.canEdit ? null : (
          <p className="text-muted-foreground text-sm" data-testid="security-read-only">
            {page.t('adminSecurity.readOnly')}
          </p>
        )}
        {page.groups.map((group) => (
          <SecuritySettingsGroupCard
            key={group.definition.group}
            group={group}
            values={page.values}
            errors={page.errors}
            secretStatus={page.secretStatus}
            disabled={!page.canEdit || page.isSaving}
            onChange={page.setValue}
            t={page.t}
          />
        ))}
        <div className="flex justify-end">
          <Button
            onClick={page.save}
            disabled={!page.canEdit || !page.hasChanges}
            isLoading={page.isSaving}
          >
            {page.isSaving ? page.t('adminSecurity.saving') : page.t('adminSecurity.save')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={page.t('adminSecurity.title')}
        description={page.t('adminSecurity.description')}
      />
      {content}
    </div>
  );
}
