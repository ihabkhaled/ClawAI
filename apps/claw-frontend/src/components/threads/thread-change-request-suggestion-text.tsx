'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useThreadSuggestionClamp } from '@/hooks/threads/use-thread-suggestion-clamp';
import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeRequestSuggestionTextProps } from '@/types/thread-publication.types';

/** A reader's suggestion; one over 600 characters is clamped with a Show more / Show less toggle. */
export function ThreadChangeRequestSuggestionText({
  text,
}: ThreadChangeRequestSuggestionTextProps): ReactElement {
  const { t } = useTranslation();
  const clamp = useThreadSuggestionClamp(text);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="min-w-0 font-medium break-words whitespace-pre-wrap">{clamp.visibleText}</p>
      {clamp.isLong ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit px-0"
          aria-expanded={clamp.expanded}
          onClick={clamp.toggle}
        >
          {clamp.expanded ? t('threadReview.showLess') : t('threadReview.showMore')}
        </Button>
      ) : null}
    </div>
  );
}
