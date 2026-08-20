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
    <div className="space-y-6">
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
        <div className="border-muted bg-muted/50 rounded border p-3 text-sm">
          {ctrl.lastTestMessage}
        </div>
      ) : null}

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}
      {ctrl.isError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
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
        <div className="max-w-full rounded border max-md:border-0">
          <table className="w-full max-md:block">
            <thead className="max-md:hidden">
              <tr className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
                <th className="px-3 py-2">{ctrl.t('research.providers.col.name')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.kind')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.baseUrl')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.status')}</th>
                <th className="px-3 py-2">{ctrl.t('research.providers.col.secret')}</th>
                <th className="px-3 py-2 text-right">{ctrl.t('research.providers.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="max-md:block max-md:space-y-3">
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
