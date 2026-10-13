'use client';

import { AlertTriangle, Puzzle } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PLUGINS_GRID_CLASSES, PLUGINS_SKELETON_KEYS } from '@/constants/plugins.constants';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { usePluginsPage } from '@/hooks/plugins/use-plugins-page';

import { PluginCard } from './plugin-card';
import { PluginCategoryChips } from './plugin-category-chips';
import { PluginsNav } from './plugins-nav';

/** Discover: search, category chips and a card per catalog plugin. Cards that are installed say so. */
export function PluginsPage(): React.ReactElement {
  const page = usePluginsPage();
  const { t } = page;
  const hasFilters = page.filters.q.length > 0 || page.filters.category.length > 0;
  const showList = !page.isLoading && !page.isError;

  return (
    <div>
      <PageHeader title={t('plugins.title')} description={t('plugins.description')} />
      <PluginsNav active={PluginsNavTab.Discover} t={t} />
      <div className="mb-6 space-y-4">
        <SearchBox
          id="plugins-search"
          label={t('plugins.searchLabel')}
          value={page.searchDraft}
          onChange={page.setSearchDraft}
        />
        <PluginCategoryChips value={page.filters.category} onChange={page.setCategory} t={t} />
      </div>

      {page.isLoading ? (
        <div className={PLUGINS_GRID_CLASSES} role="status" aria-label={t('plugins.loading')}>
          {PLUGINS_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="min-h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!page.isLoading && page.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('plugins.errorTitle')}
          description={t('plugins.errorDescription')}
          variant={EmptyStateVariant.Compact}
          action={
            <Button variant="outline" size="sm" onClick={page.retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {showList && page.items.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title={hasFilters ? t('plugins.emptyFilteredTitle') : t('plugins.emptyTitle')}
          description={
            hasFilters ? t('plugins.emptyFilteredDescription') : t('plugins.emptyDescription')
          }
          variant={EmptyStateVariant.Compact}
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={page.clearFilters}>
                {t('plugins.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {showList && page.items.length > 0 ? (
        <>
          <ul className={PLUGINS_GRID_CLASSES}>
            {page.items.map((plugin) => (
              <li key={plugin.slug} className="min-w-0">
                <PluginCard plugin={plugin} t={t} />
              </li>
            ))}
          </ul>
          {page.hasNextPage ? (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" disabled={page.isFetchingNextPage} onClick={page.loadMore}>
                {page.isFetchingNextPage ? t('plugins.loadingMore') : t('plugins.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
