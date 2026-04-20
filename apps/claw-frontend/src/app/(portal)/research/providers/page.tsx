'use client';

import { Globe, Plus } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ResearchProviderForm } from '@/components/research/research-provider-form';
import { ResearchProviderRow } from '@/components/research/research-provider-row';
import { Button } from '@/components/ui/button';
import { useResearchProvidersPage } from '@/hooks/research/use-research-providers-page';

export default function ResearchProvidersPage(): React.ReactElement {
  const ctrl = useResearchProvidersPage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={ctrl.t('research.providers.title')}
        description={ctrl.t('research.providers.description')}
        actions={
          <Button onClick={ctrl.openCreate}>
            <Plus className="me-2 size-4" />
            {ctrl.t('research.providers.createButton')}
          </Button>
        }
      />

      <ResearchProviderForm
        open={ctrl.isCreateOpen}
        onOpenChange={(o) => (o ? ctrl.openCreate() : ctrl.closeCreate())}
        form={ctrl.form}
        onSetField={ctrl.setFormField}
        onSubmit={() => void ctrl.handleSubmit()}
        isPending={ctrl.isCreatePending}
        error={ctrl.createError}
      />

      {ctrl.lastTestMessage !== null ? (
        <div className="rounded border border-muted bg-muted/50 p-3 text-sm">
          {ctrl.lastTestMessage}
        </div>
      ) : null}

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}
      {ctrl.isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {ctrl.t('research.providers.loadFailed')}
        </div>
      ) : null}
      {!ctrl.isLoading && !ctrl.isError && ctrl.providers.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={ctrl.t('research.providers.emptyTitle')}
          description={ctrl.t('research.providers.emptyDescription')}
        />
      ) : null}
      {!ctrl.isLoading && ctrl.providers.length > 0 ? (
        <div className="rounded border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">{ctrl.t('research.providers.col.name')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.kind')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.baseUrl')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.status')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.secret')}</th>
                <th className="px-3 py-2 text-right">{ctrl.t('research.providers.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {ctrl.providers.map((p) => (
                <ResearchProviderRow
                  key={p.id}
                  provider={p}
                  onTest={ctrl.handleTest}
                  onDelete={ctrl.handleDelete}
                  isTestPending={ctrl.isTestPending}
                  isDeletePending={ctrl.isDeletePending}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
