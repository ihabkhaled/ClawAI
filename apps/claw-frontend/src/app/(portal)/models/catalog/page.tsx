'use client';

import { Store } from 'lucide-react';

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
    isLoading,
    isError,
    category,
    search,
    pullJobs,
    handleCategoryChange,
    handleSearchChange,
    handlePull,
    handleCancelJob,
    isPullPending,
    isCancelPending,
    getJobForModel,
    hasActiveJobs,
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

      <Input
        placeholder={t('catalog.searchPlaceholder')}
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

      {!isLoading && entries.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t('catalog.noModels')}
          description={t('catalog.searchPlaceholder')}
        />
      ) : null}

      {!isLoading && entries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <CatalogModelCard
              key={entry.id}
              entry={entry}
              job={getJobForModel(entry.name)}
              onPull={handlePull}
              isPullPending={isPullPending}
              t={t}
            />
          ))}
        </div>
      ) : null}

      {hasActiveJobs ? (
        <ActiveDownloadsPanel
          jobs={pullJobs}
          onCancel={handleCancelJob}
          isCancelPending={isCancelPending}
          t={t}
        />
      ) : null}
    </div>
  );
}
