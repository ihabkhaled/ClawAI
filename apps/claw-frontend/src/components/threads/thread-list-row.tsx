import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { ThreadErrorNotice } from '@/components/threads/thread-error-notice';
import { ThreadListRowStatus } from '@/components/threads/thread-list-row-status';
import { Button } from '@/components/ui/button';
import { useThreadListText } from '@/hooks/threads/use-thread-list-text';
import { useTranslation } from '@/lib/i18n';
import type { ThreadListRowProps } from '@/types/thread-list.types';
import { formatThreadListDate } from '@/utilities/thread-list-text.utility';
import { threadReviewPath } from '@/utilities/thread-review-path.utility';

/** One Thread: title and date on the start side; status, Publish and Delete on the end side. */
export function ThreadListRow({
  item,
  onPublish,
  isPublishing,
  publishError,
  onDelete,
}: ThreadListRowProps): ReactElement {
  const { t, locale } = useTranslation();
  const tl = useThreadListText();
  const title = item.title ?? t('chat.untitled');

  return (
    <li
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="thread-list-row"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={threadReviewPath(item.id)} className="font-medium break-words hover:underline">
          {title}
        </Link>
        <time className="text-muted-foreground text-xs" dateTime={item.createdAt}>
          {tl('threadListCreatedOn', { date: formatThreadListDate(item.createdAt, locale) })}
        </time>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <ThreadListRowStatus item={item} />
          {item.canPublish ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onPublish(item)}
              disabled={isPublishing}
              isLoading={isPublishing}
              aria-label={tl('threadListPublishAria', { title })}
            >
              {tl('threadListPublish')}
            </Button>
          ) : null}
          {item.canDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDelete(item)}
              aria-label={tl('threadListDeleteAria', { title })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {tl('threadListDelete')}
            </Button>
          ) : null}
        </div>
        {publishError === null ? null : <ThreadErrorNotice message={publishError} />}
      </div>
    </li>
  );
}
