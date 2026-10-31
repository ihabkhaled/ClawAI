import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { THREAD_LIST_SKELETON_ROWS } from '@/constants/thread-list.constants';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { useThreadListText } from '@/hooks/threads/use-thread-list-text';
import { useTranslation } from '@/lib/i18n';
import type { ThreadListEmptyProps, ThreadListErrorProps } from '@/types/thread-list.types';

/** Placeholder rows for the very first load. */
export function ThreadListSkeleton(): ReactElement {
  const tl = useThreadListText();
  return (
    <div role="status" aria-label={tl('threadListLoading')} className="flex flex-col gap-2">
      {Array.from({ length: THREAD_LIST_SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="min-h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Nothing to show: no Threads at all, no match for the search, or none with that status. */
export function ThreadListEmpty({ query, status, onClear }: ThreadListEmptyProps): ReactElement {
  const { t } = useTranslation();
  const tl = useThreadListText();
  const filtered = query !== '' || status !== ThreadListStatus.ALL;
  let message = t('chat.noThreads');
  if (query !== '') {
    message = tl('threadListNoResults', { query });
  } else if (filtered) {
    message = tl('threadListNoStatusResults');
  }
  return (
    <div
      className="border-border bg-muted/20 text-muted-foreground flex flex-col items-center gap-3 rounded-lg border p-6 text-center text-sm"
      data-testid="thread-list-empty"
    >
      <p>{message}</p>
      {filtered ? (
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          {tl('threadListClearFilters')}
        </Button>
      ) : null}
    </div>
  );
}

/** The page could not be loaded; Try again asks the service once more. */
export function ThreadListError({ onRetry }: ThreadListErrorProps): ReactElement {
  const tl = useThreadListText();
  return (
    <div
      role="alert"
      className="border-destructive/40 flex flex-col items-center gap-3 rounded-lg border p-6 text-center text-sm"
    >
      <p>{tl('threadListLoadFailed')}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {tl('threadListRetry')}
      </Button>
    </div>
  );
}
