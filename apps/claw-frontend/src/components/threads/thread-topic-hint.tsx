import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';

/** Shown under the topic box when text is typed but too short; same rule as the service. */
export function ThreadTopicHint(): ReactElement {
  const { t } = useTranslation();
  return (
    <p role="alert" className="text-destructive text-xs">
      {t('chat.threadFixTopicTooShort')}
    </p>
  );
}
