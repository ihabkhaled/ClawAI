'use client';

import { Check, Copy, ExternalLink, Eye, MessageSquare, Share2, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { BoardReaderShareLinks } from '@/components/threads/board/board-reader-share-links';
import { Button } from '@/components/ui/button';
import { useThreadShare } from '@/hooks/threads/use-thread-share';
import { useTranslation } from '@/lib/i18n';
import type { BoardReaderActionsProps } from '@/types/thread-board-reader.types';

/**
 * The strip above the community section: the totals, plus sharing and the canonical public page.
 * Reacting, commenting, suggesting and reporting live in the shared community panel below it.
 */
export function BoardReaderActions({
  title,
  publicUrl,
  publicPath,
  likeCount,
  commentCount,
  viewCount,
}: BoardReaderActionsProps): ReactElement {
  const { t } = useTranslation();
  const share = useThreadShare({ url: publicUrl ?? '', title });
  const canShare = publicUrl !== null;

  return (
    <div
      role="group"
      aria-label={t('chat.threadBoardReaderEngage')}
      data-no-print
      data-testid="board-reader-actions"
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <li className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadBoardLikes', { count: String(likeCount) })}
        </li>
        <li className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadBoardComments', { count: String(commentCount) })}
        </li>
        <li className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadBoardViews', { count: String(viewCount) })}
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canShare}
          onClick={() => {
            void share.copyLink();
          }}
        >
          {share.hasCopied ? (
            <Check className="dark:text-success h-4 w-4 text-green-700" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {share.hasCopied ? t('chat.threadShareCopied') : t('chat.threadBoardCopyLink')}
        </Button>
        {share.canShareNatively ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canShare}
            onClick={() => {
              void share.shareNatively();
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadShareNative')}
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={publicPath} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('chat.threadBoardOpenPublic')}
          </Link>
        </Button>
      </div>
      <BoardReaderShareLinks title={title} publicUrl={publicUrl} />
      {share.hasCopyFailed ? (
        <p role="alert" className="w-full text-sm">
          {t('chat.threadShareCopyFailed')}
        </p>
      ) : null}
    </div>
  );
}
