import { ShieldAlert } from 'lucide-react';
import type { ReactElement } from 'react';

import { THREAD_SAFETY_KIND_KEYS } from '@/constants/thread-safety.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadSafetyBlockNoticeProps } from '@/types/thread-publication.types';

/**
 * Shown when the sensitive-details scan blocked the newest text: names each flagged passage
 * (secrets and card numbers arrive already masked) so the owner can edit it out and save again.
 */
export function ThreadSafetyBlockNotice({ block }: ThreadSafetyBlockNoticeProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="border-destructive/50 bg-destructive/5 flex flex-col gap-2 rounded-md border p-4"
      data-testid="thread-safety-block"
    >
      <p className="flex items-center gap-2 font-medium">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        {t('chat.threadFixSafetyTitle')}
      </p>
      <p className="text-sm">{t('chat.threadFixSafetyHint')}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {block.findings.map((finding, index) => (
          <li key={`${finding.kind}-${String(index)}`} className="flex flex-col gap-1">
            <span className="font-medium">{t(THREAD_SAFETY_KIND_KEYS[finding.kind])}</span>
            <q dir="auto" className="bg-muted/40 rounded px-2 py-1 font-mono break-words">
              {finding.excerpt}
            </q>
          </li>
        ))}
      </ul>
    </div>
  );
}
