import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { useThreadListText } from '@/hooks/threads/use-thread-list-text';
import { useTranslation } from '@/lib/i18n';
import type { ThreadListRowStatusProps } from '@/types/thread-list.types';
import { boardItemPath } from '@/utilities/thread-board-view.utility';
import { describeThreadListFailure } from '@/utilities/thread-list-failure.utility';

/** The state of one row: Generating chip, Ready chip, Published chip + link, or the failure and why. */
export function ThreadListRowStatus({ item }: ThreadListRowStatusProps): ReactElement | null {
  const { t } = useTranslation();
  const tl = useThreadListText();

  if (item.status === ThreadListStatus.FAILED) {
    const why = item.failure === null ? null : describeThreadListFailure(item.failure);
    return (
      <div className="flex min-w-0 items-start gap-2" data-testid="thread-list-failed">
        <AlertTriangle
          className="text-destructive mt-0.5 h-4 w-4 shrink-0"
          role="img"
          aria-label={tl('threadListFailedLabel')}
        />
        <p className="text-sm break-words">
          <span className="text-destructive font-medium">{tl('threadListFailedLabel')}</span>
          {why === null ? null : (
            <span className="text-muted-foreground block">
              {why.listKey === null ? t(why.messageKey ?? '', why.params) : tl(why.listKey)}
              {why.retryable ? ` ${tl('threadListRetryable')}` : ''}
            </span>
          )}
        </p>
      </div>
    );
  }
  if (item.status === ThreadListStatus.GENERATING) {
    return (
      <Badge variant="info" className="gap-1" data-testid="thread-list-generating">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {tl('threadListGenerating')}
      </Badge>
    );
  }
  if (item.status === ThreadListStatus.PUBLISHED) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" className="gap-1" data-testid="thread-list-published">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {tl('threadListPublishedChip')}
        </Badge>
        {item.slug === null ? null : (
          <Link
            href={boardItemPath(item.slug)}
            className="text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {tl('threadListViewPublic')}
          </Link>
        )}
      </div>
    );
  }
  return (
    <Badge variant="secondary" data-testid="thread-list-ready">
      {tl('threadListReady')}
    </Badge>
  );
}
