import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadErrorNoticeProps } from '@/types/thread-generation-progress.types';

/** One translated, status-specific failure line. Replaces the old catch-all sentence. */
export function ThreadErrorNotice({ message }: ThreadErrorNoticeProps): ReactElement {
  const { t } = useTranslation();
  return (
    <p role="alert" className="text-destructive text-sm">
      {t(message.key, message.params)}
    </p>
  );
}
