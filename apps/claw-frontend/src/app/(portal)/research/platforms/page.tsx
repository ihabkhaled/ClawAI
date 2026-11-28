'use client';

import { LayoutGrid, Plus } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ResearchPlatformFilter } from '@/components/research/platforms/research-platform-filter';
import { ResearchPlatformFormDialog } from '@/components/research/platforms/research-platform-form-dialog';
import { ResearchPlatformGroup } from '@/components/research/platforms/research-platform-group';
import { Button } from '@/components/ui/button';
import { useResearchPlatformsPage } from '@/hooks/research/use-research-platforms-page';

export default function ResearchPlatformsPage(): React.ReactElement {
  const ctrl = useResearchPlatformsPage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={ctrl.t('researchPlatforms.title')}
        description={ctrl.t('researchPlatforms.description')}
        actions={
          <Button onClick={ctrl.form.openCreate} data-testid="research-platforms-add">
            <Plus className="me-2 size-4" aria-hidden="true" />
            {ctrl.t('researchPlatforms.addButton')}
          </Button>
        }
      />

      <ResearchPlatformFormDialog t={ctrl.t} controller={ctrl.form} />

      <ConfirmDialog
        open={ctrl.deletion.pending !== null}
        onOpenChange={ctrl.deletion.onOpenChange}
        title={ctrl.deleteTitle}
        description={ctrl.t('researchPlatforms.deleteDescription')}
        confirmLabel={ctrl.t('researchPlatforms.delete')}
        cancelLabel={ctrl.t('common.cancel')}
        onConfirm={() => void ctrl.deletion.confirm()}
        isConfirming={ctrl.deletion.isDeleting}
      />

      {ctrl.toggle.hasFailed ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm"
        >
          {ctrl.t('researchPlatforms.updateFailed')}
        </div>
      ) : null}

      {ctrl.isLoading ? <LoadingSpinner label={ctrl.t('common.loading')} /> : null}
      {ctrl.isError ? (
        <div
          role="alert"
          data-testid="research-platforms-error"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm"
        >
          {ctrl.t('researchPlatforms.loadFailed')}
        </div>
      ) : null}
      {!ctrl.isLoading && !ctrl.isError && ctrl.platforms.length === 0 ? (
        <div data-testid="research-platforms-empty">
          <EmptyState
            icon={LayoutGrid}
            title={ctrl.t('researchPlatforms.emptyTitle')}
            description={ctrl.t('researchPlatforms.emptyDescription')}
          />
        </div>
      ) : null}
      {!ctrl.isLoading && ctrl.platforms.length > 0 ? (
        <div className="space-y-6">
          <ResearchPlatformFilter
            t={ctrl.t}
            value={ctrl.filter.filterValue}
            onChange={ctrl.filter.onFilterChange}
          />
          {ctrl.filter.groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {ctrl.t('researchPlatforms.filterEmpty')}
            </p>
          ) : null}
          {ctrl.filter.groups.map((group) => (
            <ResearchPlatformGroup
              key={group.category}
              t={ctrl.t}
              group={group}
              togglingId={ctrl.toggle.pendingId}
              testingIds={ctrl.testingIds}
              testViews={ctrl.testViews}
              onToggle={(platform, enabled) => void ctrl.toggle.toggle(platform, enabled)}
              onTest={ctrl.runTest}
              onEdit={ctrl.form.openEdit}
              onDelete={ctrl.deletion.request}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
