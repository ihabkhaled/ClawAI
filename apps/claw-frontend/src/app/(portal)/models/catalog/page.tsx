'use client';

import { Loader2, Store } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ActiveDownloadsPanel } from '@/components/models/active-downloads-panel';
import { CatalogCategoryFilter } from '@/components/models/catalog-category-filter';
import { CatalogModelCard } from '@/components/models/catalog-model-card';
import { Input } from '@/components/ui/input';
import { useModelCatalogPage } from '@/hooks/ollama/use-model-catalog-page';

export default function ModelCatalogPage(): React.ReactElement {
  const {
    t,
    entries,
    meta,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    sentinelRef,
    category,
    search,
    pullJobs,
    handleCategoryChange,
    handleSearchChange,
    handlePull,
    handleCancelJob,
    handleDelete,
    isPullPending,
    isCancelPending,
    isDeletePending,
    getJobForModel,
    hasActiveJobs,
    downloadStatsMap,
  } = useModelCatalogPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('catalog.title')} description={t('catalog.description')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">{t('models.loadFailed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('catalog.title')} description={t('catalog.description')} />

      <CatalogCategoryFilter selectedCategory={category} onSelect={handleCategoryChange} t={t} />

      <div className="flex items-center gap-3">
        <Input
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        {!isLoading ? (
          <span className="text-sm text-muted-foreground">
            {entries.length} / {meta.total} {t('catalog.models')}
          </span>
        ) : null}
      </div>

      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

      {!isLoading && entries.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t('catalog.noModels')}
          description={t('catalog.searchPlaceholder')}
        />
      ) : null}

      {hasActiveJobs ? (
        <ActiveDownloadsPanel
          jobs={pullJobs}
          downloadStatsMap={downloadStatsMap}
          onCancel={handleCancelJob}
          isCancelPending={isCancelPending}
          t={t}
        />
      ) : null}

      {!isLoading && entries.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <CatalogModelCard
                key={entry.id}
                entry={entry}
                job={getJobForModel(entry.ollamaName ?? `${entry.name}:${entry.tag}`)}
                onPull={handlePull}
                onDelete={handleDelete}
                isPullPending={isPullPending}
                isDeletePending={isDeletePending}
                t={t}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {isFetchingNextPage && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {!isFetchingNextPage && hasNextPage && (
              <span className="text-xs text-muted-foreground">{t('catalog.scrollForMore')}</span>
            )}
            {!isFetchingNextPage && !hasNextPage && (
              <span className="text-xs text-muted-foreground">{t('catalog.allLoaded')}</span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
