import { CircleDot, Loader2 } from 'lucide-react';

import { StreamLiveAnswer } from '@/components/chat/stream/stream-live-answer';
import { StreamMetricsHud } from '@/components/chat/stream/stream-metrics-hud';
import { StreamProgressBar } from '@/components/chat/stream/stream-progress-bar';
import { StreamStageBadge } from '@/components/chat/stream/stream-stage-badge';
import { StreamThinkingPanel } from '@/components/chat/stream/stream-thinking-panel';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { ParallelLaneCardProps } from '@/types';

// One compare-grid card showing a single model's INDEPENDENT live stream while
// the parallel run is in flight (before the terminal result row arrives).
export function ParallelLaneCard({
  provider,
  model,
  lane,
}: ParallelLaneCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{model}</div>
          <div className="truncate text-[11px] text-muted-foreground">{provider}</div>
        </div>
        {lane !== undefined ? (
          <div className="flex items-center gap-1.5">
            <StreamStageBadge stage={lane.stage} />
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
              {t('chat.live')}
            </span>
          </div>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {lane?.metrics !== undefined ? (
        <StreamProgressBar
          percent={lane.metrics.progressPercent}
          confidence={lane.metrics.progressConfidence}
        />
      ) : null}
      {lane !== undefined ? (
        <StreamThinkingPanel reasoning={lane.reasoning} visibility={lane.reasoningVisibility} />
      ) : null}
      {lane !== undefined && lane.content.length > 0 ? (
        <StreamLiveAnswer content={lane.content} isStreaming={lane.isStreaming} />
      ) : (
        <div className="text-xs text-muted-foreground">{t('chat.stream.stage.connecting')}</div>
      )}
      {lane?.metrics !== undefined ? (
        <StreamMetricsHud metrics={lane.metrics} usage={lane.usage} />
      ) : null}
    </Card>
  );
}
