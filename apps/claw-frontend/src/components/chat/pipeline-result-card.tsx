'use client';

import { ExternalLink } from 'lucide-react';

import { PipelineStageItem } from '@/components/chat/pipeline-stage-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineResultCardProps } from '@/types';

export function PipelineResultCard({ result, onViewInThread, t }: PipelineResultCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('pipeline.title')}</CardTitle>
            <Button variant="outline" size="sm" onClick={onViewInThread}>
              <ExternalLink className="me-2 h-3 w-3" />
              {t('pipeline.viewInThread')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{result.content}</p>
        </CardContent>
      </Card>

      {result.metadata.stages.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('pipeline.stageBreakdown')}
          </h3>
          {result.metadata.stages.map((stage, i) => (
            <PipelineStageItem
              key={`${stage.stageName}-${String(i)}`}
              stage={stage}
              stageNumber={i + 1}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
