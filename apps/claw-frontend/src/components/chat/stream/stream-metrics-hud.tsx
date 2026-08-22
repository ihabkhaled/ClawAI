import { Clock, Coins, Gauge, Hash, Timer } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StreamMetricsHudProps } from '@/types';
import {
  formatCostUsd,
  formatElapsed,
  formatStreamTokens,
  formatTokensPerSecond,
} from '@/utilities';

export function StreamMetricsHud({
  metrics,
  usage,
  className,
}: StreamMetricsHudProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (metrics === undefined && usage === undefined) {
    return null;
  }

  const tps = formatTokensPerSecond(metrics?.tokensPerSecond);
  const tokens = formatStreamTokens(usage?.totalTokens ?? metrics?.generatedTokens);
  const ttft =
    metrics?.timeToFirstTokenMs !== undefined ? formatElapsed(metrics.timeToFirstTokenMs) : null;
  const elapsed = metrics?.elapsedMs !== undefined ? formatElapsed(metrics.elapsedMs) : null;
  const cost = formatCostUsd(
    usage?.finalCostUsd ?? metrics?.estimatedCostUsd,
    usage?.costAvailable ?? metrics?.estimatedCostUsd !== undefined,
  );

  return (
    <div
      className={cn(
        'touch:text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]',
        className,
      )}
    >
      {elapsed !== null ? (
        <span className="inline-flex items-center gap-1" title={t('chat.stream.elapsed')}>
          <Clock className="h-3 w-3" /> {elapsed}
        </span>
      ) : null}
      {ttft !== null ? (
        <span className="inline-flex items-center gap-1" title={t('chat.stream.timeToFirstToken')}>
          <Timer className="h-3 w-3" /> {t('chat.stream.ttft')} {ttft}
        </span>
      ) : null}
      {tps !== null ? (
        <span className="inline-flex items-center gap-1" title={t('chat.stream.throughput')}>
          <Gauge className="h-3 w-3" /> {tps}
        </span>
      ) : null}
      {tokens !== null ? (
        <span className="inline-flex items-center gap-1" title={t('chat.stream.tokens')}>
          <Hash className="h-3 w-3" /> {tokens} {t('chat.stream.tokens')}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1" title={t('chat.stream.cost')}>
        <Coins className="h-3 w-3" /> {cost ?? t('chat.stream.costUnavailable')}
      </span>
    </div>
  );
}
