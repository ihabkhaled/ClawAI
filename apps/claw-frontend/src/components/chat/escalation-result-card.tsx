import { CheckCircle2, ExternalLink, GitFork } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from '@/lib/markdown';
import type { EscalationResultCardProps } from '@/types';
import { getEscalationStatusBadgeVariant, getEscalationStatusLabel } from '@/utilities';

export function EscalationResultCard({ result, onViewInThread, t }: EscalationResultCardProps) {
  const { metadata } = result;
  const statusVariant = getEscalationStatusBadgeVariant(metadata.status);
  const statusLabel = getEscalationStatusLabel(metadata.status, t);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <GitFork className="h-4 w-4" />
            {t('escalation.resultTitle')}
          </CardTitle>
          <Badge variant={statusVariant} className="text-xs">
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('escalation.stepUsed')}:</span>
            <span className="font-medium">{metadata.stepUsed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('escalation.totalSteps')}:</span>
            <span className="font-medium">{metadata.totalSteps}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {metadata.escalated ? (
              <Badge variant="secondary" className="text-xs">
                <GitFork className="me-1 h-3 w-3" />
                {t('escalation.escalated')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="me-1 h-3 w-3" />
                {t('escalation.notEscalated')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('escalation.finalModel')}:</span>
            <span className="text-xs font-medium">
              {metadata.finalProvider} / {metadata.finalModel}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t('escalation.finalAnswer')}</p>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <MarkdownRenderer content={result.content} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" onClick={onViewInThread}>
          <ExternalLink className="me-2 h-4 w-4" />
          {t('escalation.viewInThread')}
        </Button>
      </CardFooter>
    </Card>
  );
}
