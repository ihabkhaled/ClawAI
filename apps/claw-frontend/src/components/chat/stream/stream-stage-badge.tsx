import { STREAM_STAGE_LABEL_KEYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StreamStageBadgeProps } from '@/types';

export function StreamStageBadge({ stage, className }: StreamStageBadgeProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (stage === undefined) {
    return null;
  }
  const labelKey = STREAM_STAGE_LABEL_KEYS[stage];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300',
        className,
      )}
    >
      {t(labelKey)}
    </span>
  );
}
