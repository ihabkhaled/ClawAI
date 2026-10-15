'use client';

import { FilePenLine } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useLocalizedHref } from '@/hooks/common/use-localized-href';
import { useTranslation } from '@/lib/i18n';
import type { ThreadOwnerChangeBarProps } from '@/types/thread-publication.types';
import { threadReviewPath } from '@/utilities/thread-review-path.utility';

/**
 * Shown only to the signed-in owner on their own public Thread: how many reader suggestions wait,
 * with a link straight to the review screen. Nobody else is ever told.
 */
export function ThreadOwnerChangeBar({
  publicationId,
  pendingChangeRequests,
}: ThreadOwnerChangeBarProps): ReactElement | null {
  const { t } = useTranslation();
  const localise = useLocalizedHref();
  if (pendingChangeRequests <= 0) {
    return null;
  }

  return (
    <aside
      data-testid="thread-owner-change-bar"
      className="border-primary/40 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <FilePenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('chat.threadCrOwnerBar', { count: String(pendingChangeRequests) })}
      </p>
      <Button asChild size="sm" className="min-h-11">
        <Link href={localise(threadReviewPath(publicationId))}>
          {t('chat.threadCrOwnerBarReview')}
        </Link>
      </Button>
    </aside>
  );
}
