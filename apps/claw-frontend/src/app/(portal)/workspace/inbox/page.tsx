'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { InboxFilterBar } from '@/components/inbox/inbox-filter-bar';
import { InboxRow } from '@/components/inbox/inbox-row';
import { Button } from '@/components/ui/button';
import { useInboxPage } from '@/hooks/inbox/use-inbox-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceInboxPage(): ReactElement {
  const { t } = useTranslation();
  const {
    items,
    isLoading,
    isError,
    error,
    filter,
    setFilter,
    hasMore,
    loadMore,
    isLoadingMore,
    toggleNeedsAttention,
    isUpdating,
  } = useInboxPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('inbox.page.title')}
        description={t('inbox.page.description')}
      />

      <InboxFilterBar filter={filter} onChange={setFilter} t={t} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('inbox.page.loading')}</p>
      ) : null}

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('inbox.page.error')}
        </p>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('inbox.page.empty')}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              onToggleNeedsAttention={toggleNeedsAttention}
              isUpdating={isUpdating}
              t={t}
            />
          ))}
          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? t('inbox.page.loadingMore') : t('inbox.page.loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
