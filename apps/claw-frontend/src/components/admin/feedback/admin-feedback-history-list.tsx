'use client';

import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackHistoryListProps } from '@/types/feedback-props.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';
import { feedbackStatusLabelKey } from '@/utilities/feedback-label.utility';

// The history rendered raw enum names next to a raw action badge
// ("STATUS_CHANGED  OPEN → RESOLVED"). A dotted rail with translated statuses
// says the same thing without shouting machine identifiers at the reader.
export function AdminFeedbackHistoryList({ entries }: AdminFeedbackHistoryListProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ol className="border-border/70 space-y-4 border-s ps-4">
      {entries.map((entry) => (
        <li key={`${entry.action}-${entry.at}`} className="relative">
          <span
            className="bg-primary/60 ring-background absolute -start-[21px] top-1.5 size-2 rounded-full ring-4"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            {entry.fromStatus === null
              ? t(feedbackStatusLabelKey(entry.toStatus ?? ''))
              : `${t(feedbackStatusLabelKey(entry.fromStatus))} → ${t(feedbackStatusLabelKey(entry.toStatus ?? ''))}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {entry.actorEmail} · {formatDateTimeSafe(entry.at)}
          </p>
          {entry.note === null ? null : (
            <p className="text-muted-foreground mt-1 text-xs italic">{entry.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
