'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PermissionMatrix } from '@/components/admin/roles/permission-matrix';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums';
import { useRoleDetailPage } from '@/hooks/roles/use-role-detail-page';

export default function AdminRoleDetailPage(): ReactElement {
  const {
    t,
    user,
    role,
    groups,
    selected,
    isLoading,
    isError,
    error,
    isDirty,
    isSaving,
    saveError,
    togglePermission,
    selectGroup,
    onSave,
    onReset,
    onCancel,
    onRetry,
  } = useRoleDetailPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={role?.name ?? t('adminRoles.detail.title')}
        description={t('adminRoles.detail.description')}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminRoles.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminRoles.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {saveError !== null ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
          role="alert"
        >
          {saveError.message || t('adminRoles.detail.saveFailed')}
        </p>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onSave} disabled={isSaving || !isDirty}>
              {isSaving ? t('adminRoles.detail.saving') : t('common.save')}
            </Button>
            <Button type="button" variant="outline" onClick={onReset} disabled={!isDirty}>
              {t('adminRoles.detail.reset')}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>

          <PermissionMatrix
            groups={groups}
            selected={selected}
            togglePermission={togglePermission}
            selectGroup={selectGroup}
            disabled={isSaving}
            t={t}
          />
        </>
      ) : null}
    </div>
  );
}
