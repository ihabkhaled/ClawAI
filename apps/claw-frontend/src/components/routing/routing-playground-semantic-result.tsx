'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import type { RoutingPlaygroundSemanticResultProps } from '@/types';
import { toMarkdownJsonBlock } from '@/utilities';

export function RoutingPlaygroundSemanticResult({
  result,
}: RoutingPlaygroundSemanticResultProps): React.ReactElement {
  const { t } = useTranslation();
  const analysis = result.analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('routingPlayground.result.title')}</CardTitle>
        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant={result.status === 'SUCCESS' ? 'default' : 'destructive'}>
            {result.status}
          </Badge>
          <Badge variant="outline">
            {t('routingPlayground.result.routerModel', { model: result.routerModel })}
          </Badge>
          <Badge variant="outline">
            {t('routingPlayground.result.attempts', { count: String(result.attempts) })}
          </Badge>
          <Badge variant="outline">
            {t('routingPlayground.result.duration', { ms: String(result.durationMs) })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {analysis === null ? (
          <div className="space-y-2 text-sm">
            <p className="text-destructive">
              {t('routingPlayground.result.noAnalysis', { status: result.status })}
            </p>
            {result.failureReason !== undefined ? (
              <p className="text-muted-foreground text-xs">{result.failureReason}</p>
            ) : null}
            {result.rawOutputExcerpt !== undefined ? (
              <pre className="bg-muted touch:text-xs overflow-x-auto rounded p-2 text-[11px]">
                {result.rawOutputExcerpt}
              </pre>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">
                {t('routingPlayground.result.primaryIntent')}: {analysis.primaryIntent}
              </Badge>
              <Badge variant="secondary">
                {t('routingPlayground.result.taskType')}: {analysis.taskType}
              </Badge>
              <Badge variant="secondary">
                {t('routingPlayground.result.risk')}: {analysis.riskLevel}
              </Badge>
              <Badge variant="secondary">
                {t('routingPlayground.result.privacy')}: {analysis.privacyClass}
              </Badge>
              <Badge variant="secondary">
                {t('routingPlayground.result.confidence')}:{' '}
                {`${String(Math.round(analysis.confidence * 100))}%`}
              </Badge>
            </div>
            <MarkdownRenderer content={toMarkdownJsonBlock(analysis)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
