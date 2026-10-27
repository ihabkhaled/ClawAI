import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadReviewVerdictViewProps } from '@/types/thread-generation-progress.types';

/**
 * What a reviewer said when a draft did not pass: the score next to the minimum, and the blocker
 * texts exactly as the reviewer wrote them. A blocker is in the article's language, so it is
 * quoted with `dir="auto"` and never translated.
 */
export function ThreadReviewVerdictView({
  verdict,
  reviewerLabel,
}: ThreadReviewVerdictViewProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="thread-review-verdict">
      {verdict.blockers.length === 0 ? null : (
        <>
          {reviewerLabel === null ? null : (
            <p>
              {t(
                verdict.blocked ? 'chat.threadEvidenceBlockedLead' : 'chat.threadEvidenceLowLead',
                { reviewer: reviewerLabel },
              )}
            </p>
          )}
          <ul className="flex flex-col gap-2" aria-label={t('chat.threadEvidenceBlockerLabel')}>
            {verdict.blockers.map((blocker) => (
              <li key={blocker}>
                <blockquote
                  dir="auto"
                  className="border-border bg-muted/30 border-s-2 p-2 text-sm break-words whitespace-pre-wrap"
                  data-testid="thread-review-blocker"
                >
                  {blocker}
                </blockquote>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-muted-foreground text-xs" data-testid="thread-review-score">
        {t('chat.threadEvidenceScoreLine', {
          score: String(verdict.score),
          min: String(verdict.minScore),
        })}
      </p>
    </div>
  );
}
