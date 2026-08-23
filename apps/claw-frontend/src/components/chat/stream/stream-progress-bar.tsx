import { AiStreamProgressConfidence } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StreamProgressBarProps } from '@/types';

export function StreamProgressBar({
  percent,
  confidence,
  className,
}: StreamProgressBarProps): React.ReactElement {
  const { t } = useTranslation();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const isEstimated = confidence !== undefined && confidence !== AiStreamProgressConfidence.EXACT;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="touch:text-xs text-muted-foreground flex items-center justify-between text-[11px]">
        <span>{t('chat.stream.progress')}</span>
        <span className="tabular-nums">
          {clamped}%{isEstimated ? ` · ${t('chat.stream.estimated')}` : ''}
        </span>
      </div>
      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('chat.stream.progress')}
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-200 ease-out"
          style={{ width: `${String(clamped)}%` }}
        />
      </div>
    </div>
  );
}
