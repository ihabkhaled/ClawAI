import { useRef } from 'react';
import type { ReactElement } from 'react';

import { ThreadGenerationDeleteDialog } from '@/components/threads/thread-generation-delete-dialog';
import { ThreadListRow } from '@/components/threads/thread-list-row';
import {
  ThreadListEmpty,
  ThreadListError,
  ThreadListSkeleton,
} from '@/components/threads/thread-list-states';
import { ThreadListToolbar } from '@/components/threads/thread-list-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { THREAD_LIST_PAGE_SIZE } from '@/constants/thread-list.constants';
import { useThreadList } from '@/hooks/threads/use-thread-list';
import { useThreadListText } from '@/hooks/threads/use-thread-list-text';
import { useTranslation } from '@/lib/i18n';
import { clampPage, pageRange } from '@/utilities/pagination.utility';

/** The owner's Threads: search, status filter, rows with actions, pagination. */
export function ThreadListView(): ReactElement {
  const { t } = useTranslation();
  const tl = useThreadListText();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const list = useThreadList(headingRef);
  const rows = list.data?.items ?? [];
  const range = list.data
    ? pageRange(
        clampPage(list.data.page, list.data.totalPages),
        THREAD_LIST_PAGE_SIZE,
        list.data.total,
      )
    : null;

  let body: ReactElement;
  if (list.isLoading) {
    body = <ThreadListSkeleton />;
  } else if (list.isError && list.data === undefined) {
    body = <ThreadListError onRetry={list.refetch} />;
  } else if (rows.length === 0 && (list.data?.total ?? 0) > 0) {
    // The page is past the end; the address is being corrected, so keep the placeholder.
    body = <ThreadListSkeleton />;
  } else if (rows.length === 0) {
    body = (
      <ThreadListEmpty
        query={list.state.q}
        status={list.state.status}
        onClear={list.clearFilters}
      />
    );
  } else {
    body = (
      <ul
        className="flex flex-col gap-2"
        aria-label={tl('threadListRegionLabel')}
        aria-busy={list.isFetching}
      >
        {rows.map((item) => (
          <ThreadListRow
            key={item.id}
            item={item}
            onPublish={list.publish}
            isPublishing={list.publishingId === item.id}
            publishError={list.publishError?.id === item.id ? list.publishError.message : null}
            onDelete={list.askDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <div data-tour="threads-list" className="flex flex-col gap-4">
      <ThreadListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onSearchClear={list.clearSearch}
        status={list.state.status}
        onStatusChange={list.setStatus}
      />
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {tl('threadListRegionLabel')}
      </h2>
      <p role="status" aria-live="polite" className="sr-only" data-testid="thread-list-announce">
        {range === null
          ? ''
          : t('pagination.showing', {
              from: range.from,
              to: range.to,
              total: list.data?.total ?? 0,
            })}
      </p>
      {body}
      {list.data !== undefined && list.data.total > 0 ? (
        <Pagination
          page={list.data.page}
          pageSize={THREAD_LIST_PAGE_SIZE}
          totalPages={list.data.totalPages}
          totalItems={list.data.total}
          onPageChange={list.setPage}
          onPageSizeChange={() => undefined}
          hidePageSize
          t={t}
        />
      ) : null}
      <ThreadGenerationDeleteDialog remove={list.remove} />
    </div>
  );
}
