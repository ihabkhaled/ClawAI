import { CircleDot, Loader2 } from 'lucide-react';

import { AttachmentDeliveryChip } from '@/components/chat/attachments/attachment-delivery-chip';
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
  attachmentDelivery,
}: ParallelLaneCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-foreground truncate text-sm font-medium">{model}</div>
          <div className="touch:text-xs text-muted-foreground truncate text-[11px]">{provider}</div>
        </div>
        {lane !== undefined ? (
          <div className="flex items-center gap-1.5">
            <StreamStageBadge stage={lane.stage} />
            <span className="touch:text-xs text-muted-foreground inline-flex items-center gap-1 text-[10px]">
              <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
              {t('chat.live')}
            </span>
          </div>
        ) : (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
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
        <div className="text-muted-foreground text-xs">{t('chat.stream.stage.connecting')}</div>
      )}
      {lane?.metrics !== undefined ? (
        <StreamMetricsHud metrics={lane.metrics} usage={lane.usage} />
      ) : null}
      {attachmentDelivery && attachmentDelivery.length > 0 ? (
        <AttachmentDeliveryChip delivery={attachmentDelivery} />
      ) : null}
    </Card>
  );
}
