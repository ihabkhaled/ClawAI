'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { PipelineStageItemProps } from '@/types';

export function PipelineStageItem({ stage, stageNumber, t }: PipelineStageItemProps) {
  const outputPreview =
    stage.output.length > 200 ? `${stage.output.slice(0, 200)}...` : stage.output;

  return (
    <Card className="border-muted">
      <CardContent className="pt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {stageNumber}
          </span>
          <span className="text-sm font-medium">{stage.stageName}</span>
          <Badge variant="secondary" className="text-xs">
            {t('pipeline.model')}: {stage.model}
          </Badge>
          <span className="ms-auto text-xs text-muted-foreground">
            {t('pipeline.latency')}: {String(stage.latencyMs)}ms
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{outputPreview}</p>
      </CardContent>
    </Card>
  );
}
