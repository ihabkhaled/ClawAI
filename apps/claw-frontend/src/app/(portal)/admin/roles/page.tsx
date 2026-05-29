'use client';

import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { RoleFormDialog } from '@/components/admin/roles/role-form-dialog';
import { RoleRow } from '@/components/admin/roles/role-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { UserRole } from '@/enums';
import { useRolesPage } from '@/hooks/roles/use-roles-page';

export default function AdminRolesPage(): ReactElement {
  const {
    t,
    user,
    roles,
    isLoading,
    isError,
    error,
    pendingId,
    mutationError,
    clearMutationError,
    onDeleteRole,
    onRetry,
    dialogOpen,
    setDialogOpen,
    isCreating,
    submitCreate,
    openCreate,
  } = useRolesPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminRoles.title')}
        description={t('adminRoles.description')}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            {t('adminRoles.addRole')}
          </Button>
        }
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

      {mutationError !== null ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{mutationError.message || t('adminRoles.mutationError')}</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearMutationError}>
            {t('common.close')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && roles.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('adminRoles.empty')}
        </p>
      ) : null}

      {roles.length > 0 ? (
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              pendingId={pendingId}
              onDelete={onDeleteRole}
              detailHref={ROUTES.ADMIN_ROLE_DETAIL(role.id)}
              t={t}
            />
          ))}
        </div>
      ) : null}

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmitCreate={submitCreate}
        isSubmitting={isCreating}
        submitErrorMessage={mutationError?.message ?? null}
        t={t}
      />
    </div>
  );
}
