import { Clock, Coins, Cpu, Gauge, Hash, Timer } from 'lucide-react';

import { EXECUTION_PROFILE_LABEL_KEYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeMetricsHudProps } from '@/types';
import {
  formatCostUsd,
  formatElapsed,
  formatStreamTokens,
  formatTokensPerSecond,
} from '@/utilities';

// Runtime-neutral HUD. Mirrors the legacy StreamMetricsHud rendering exactly
// when fed a StreamMetrics + StreamUsage pair (PR1 path), and additionally
// accepts the broader RuntimeProgressMetrics shape so PR2 can pass
// llama.cpp / ComfyUI metrics without a second component. The execution
// profile badge (cpu / cuda / rocm / vulkan / metal / mixed / unknown) is
// rendered only when the prop is provided so cloud streams stay unchanged.
export function RuntimeMetricsHud({
  metrics,
  usage,
  executionProfile,
  className,
}: RuntimeMetricsHudProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (metrics === null && usage === null) {
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
  const profileLabelKey =
    executionProfile !== undefined ? EXECUTION_PROFILE_LABEL_KEYS[executionProfile] : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground',
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
      {profileLabelKey !== null ? (
        <span className="inline-flex items-center gap-1">
          <Cpu className="h-3 w-3" /> {t(profileLabelKey)}
        </span>
      ) : null}
    </div>
  );
}
