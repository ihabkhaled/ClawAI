import { Info } from 'lucide-react';
import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';

/**
 * Shown above an article whose owner accepted evidence gaps (ADR-194): some sources the topic
 * asked for could not be found, and the article lists them under Limitations. It is in the
 * viewer's language, sits outside the article so it never takes the article's direction, and is
 * never hidden.
 */
export function ThreadGapsNotice(): ReactElement {
  const { t } = useTranslation();
  return (
    <aside
      role="note"
      aria-labelledby="thread-gaps-notice-title"
      className="border-border bg-muted/40 flex min-w-0 items-start gap-3 rounded-md border border-s-4 p-4 text-sm"
      data-testid="thread-gaps-notice"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p id="thread-gaps-notice-title" className="font-semibold">
          {t('chat.threadGapsNoticeTitle')}
        </p>
        <p>{t('chat.threadGapsNoticeBody')}</p>
      </div>
    </aside>
  );
}
