import { RefreshCw } from 'lucide-react';
import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadHealingNoticeProps } from '@/types/thread-generation-progress.types';
import { healingNoticeKey } from '@/utilities/thread-recovery.utility';

/** While the service is fixing a failed step on its own: "Retrying with a different model...". */
export function ThreadGenerationHealingNotice({
  healing,
}: ThreadHealingNoticeProps): ReactElement | null {
  const { t } = useTranslation();
  const key = healingNoticeKey(healing);
  if (key === null) {
    return null;
  }
  return (
    <p
      role="status"
      className="text-muted-foreground flex items-center gap-2 text-sm"
      data-testid="thread-progress-healing"
    >
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      {t(key)}
    </p>
  );
}
