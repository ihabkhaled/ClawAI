import { Radio } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { LiveHistoryRow } from '@/components/live/live-history-row';
import { Button } from '@/components/ui/button';
import type { LiveHistoryListProps } from '@/types/live.types';

/** History: loading, error, empty and the cursor-paged list, with delete one / delete all. */
export function LiveHistoryList({
  history,
  actions,
  t,
  locale,
  onOpen,
}: LiveHistoryListProps): React.ReactElement {
  const isConfirmOpen = actions.confirmDeleteAll || actions.confirmDeleteId !== null;
  return (
    <section aria-labelledby="live-history-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="live-history-heading" className="text-foreground text-base font-semibold">
          {t('live.history.title')}
        </h2>
        {history.items.length > 0 ? (
          <Button variant="outline" size="sm" onClick={actions.askDeleteAll}>
            {t('live.history.deleteAll')}
          </Button>
        ) : null}
      </div>
      {history.isLoading ? (
        <p className="text-muted-foreground text-sm">{t('live.history.loading')}</p>
      ) : null}
      {history.isError ? (
        <div role="alert" className="text-destructive flex items-center justify-between gap-3">
          <span className="text-sm">{t('live.history.error')}</span>
          <Button variant="outline" size="sm" onClick={history.retry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!history.isLoading && !history.isError && history.items.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={t('live.history.empty')}
          description={t('live.history.emptyDescription')}
        />
      ) : null}
      {history.items.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="live-history-list">
          {history.items.map((item) => (
            <LiveHistoryRow
              key={item.id}
              item={item}
              isPending={actions.pendingId === item.id}
              t={t}
              locale={locale}
              onOpen={onOpen}
              onDelete={actions.askDelete}
              onExport={actions.exportHistory}
            />
          ))}
        </ul>
      ) : null}
      {history.hasMore ? (
        <Button
          variant="outline"
          onClick={history.loadMore}
          isLoading={history.isLoadingMore}
          className="self-center"
        >
          {t('live.history.loadMore')}
        </Button>
      ) : null}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => (open ? undefined : actions.cancelDelete())}
        title={
          actions.confirmDeleteAll
            ? t('live.history.deleteAllTitle')
            : t('live.history.deleteTitle')
        }
        description={
          actions.confirmDeleteAll
            ? t('live.history.deleteAllDescription')
            : t('live.history.deleteDescription')
        }
        confirmLabel={
          actions.confirmDeleteAll ? t('live.history.deleteAll') : t('live.history.delete')
        }
        cancelLabel={t('common.cancel')}
        onConfirm={actions.confirmDelete}
        isConfirming={actions.isDeleting}
      />
    </section>
  );
}
