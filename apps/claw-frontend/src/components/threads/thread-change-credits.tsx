'use client';

import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeCreditsProps } from '@/types/thread-publication.types';

/** "Improved with suggestions from @name": only people whose suggestion the owner accepted or applied. */
export function ThreadChangeCredits({ credits }: ThreadChangeCreditsProps): ReactElement | null {
  const { t } = useTranslation();
  if (credits.length === 0) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-sm" data-testid="thread-change-credits">
      {t('chat.threadCrCredits')}{' '}
      {credits.map((credit, index) => (
        <span key={credit.username} className="text-foreground font-medium">
          @{credit.username}
          {index < credits.length - 1 ? ', ' : ''}
        </span>
      ))}
    </p>
  );
}
