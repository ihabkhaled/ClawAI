'use client';

import { Plus, ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { AppConfigCreateDialog } from '@/components/workspace-providers/app-config-create-dialog';
import { AppConfigEditDialog } from '@/components/workspace-providers/app-config-edit-dialog';
import { AppConfigRow } from '@/components/workspace-providers/app-config-row';
import { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';
import { useWorkspaceAppConfigsPage } from '@/hooks/workspace-providers/use-workspace-app-configs-page';

export default function WorkspaceAppConfigsPage(): React.ReactElement {
  const ctrl = useWorkspaceAppConfigsPage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={ctrl.t('workspaceProviders.appConfigs.title')}
        description={ctrl.t('workspaceProviders.appConfigs.description')}
        actions={
          ctrl.canManage ? (
            <Button onClick={ctrl.openCreateDialog}>
              <Plus className="me-2 size-4" />
              {ctrl.t('workspaceProviders.appConfigs.createButton')}
            </Button>
          ) : null
        }
      />

      <AppConfigCreateDialog
        open={ctrl.isCreateOpen}
        onOpenChange={(open) => (open ? ctrl.openCreateDialog() : ctrl.closeCreateDialog())}
        providers={ctrl.providers}
        selectedProvider={ctrl.selectedProvider}
        form={ctrl.form}
        fieldErrors={ctrl.fieldErrors}
        onSetFormProvider={ctrl.setFormProvider}
        onSetFormAuthMode={ctrl.setFormAuthMode}
        onSetField={ctrl.setFormField}
        onSetPublicField={ctrl.setPublicField}
        onSetSecretField={ctrl.setSecretField}
        onSubmit={() => {
          void ctrl.handleSubmit();
        }}
        isPending={ctrl.isCreatePending}
        t={ctrl.t}
      />

      <AppConfigEditDialog
        open={ctrl.isEditOpen}
        onOpenChange={(open) => (open ? undefined : ctrl.closeEditDialog())}
        selectedProvider={ctrl.selectedProvider}
        form={ctrl.form}
        fieldErrors={ctrl.fieldErrors}
        onSetFormAuthMode={ctrl.setFormAuthMode}
        onSetField={ctrl.setFormField}
        onSetPublicField={ctrl.setPublicField}
        onSetSecretField={ctrl.setSecretField}
        onSubmit={() => {
          void ctrl.handleEditSubmit();
        }}
        isPending={ctrl.isEditPending}
        t={ctrl.t}
      />

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}

      {ctrl.isError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
          {ctrl.t('workspaceProviders.appConfigs.loadFailed')}
        </div>
      ) : null}

      {ctrl.testResult !== undefined ? (
        <div
          className={
            ctrl.testResult.status === WorkspaceConnectorStatus.CONNECTED
              ? 'rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600'
              : 'border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm'
          }
        >
          {ctrl.t('workspaceProviders.appConfigs.testResult', {
            status: ctrl.testResult.status,
            latency: String(ctrl.testResult.latencyMs),
          })}
          {ctrl.testResult.errorMessage !== undefined ? ` — ${ctrl.testResult.errorMessage}` : ''}
        </div>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.configs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={ctrl.t('workspaceProviders.appConfigs.emptyTitle')}
          description={ctrl.t('workspaceProviders.appConfigs.emptyDescription')}
          action={
            ctrl.canManage ? (
              <Button onClick={ctrl.openCreateDialog}>
                <Plus className="me-2 size-4" />
                {ctrl.t('workspaceProviders.appConfigs.createButton')}
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!ctrl.isLoading && ctrl.configs.length > 0 ? (
        <div className="max-w-full rounded border max-md:border-0">
          <table className="w-full max-md:block">
            <thead className="max-md:hidden">
              <tr className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.name')}
                </th>
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.provider')}
                </th>
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.authMode')}
                </th>
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.status')}
                </th>
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.secret')}
                </th>
                <th className="px-4 py-2">
                  {ctrl.t('workspaceProviders.appConfigs.columns.lastValidated')}
                </th>
                <th className="px-4 py-2 text-right">
                  {ctrl.t('workspaceProviders.appConfigs.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="max-md:block max-md:space-y-3">
              {ctrl.configs.map((config) => (
                <AppConfigRow
                  key={config.id}
                  config={config}
                  onTest={ctrl.handleTest}
                  onDelete={ctrl.handleDelete}
                  onConnect={ctrl.handleConnect}
                  onEdit={ctrl.openEditDialog}
                  isTestPending={ctrl.isTestPending}
                  isDeletePending={ctrl.isDeletePending}
                  isConnectPending={ctrl.isConnectPending}
                  canManage={ctrl.canManage}
                  t={ctrl.t}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
