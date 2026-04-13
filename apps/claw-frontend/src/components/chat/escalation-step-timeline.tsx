import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { EscalationStepTimelineProps } from '@/types';

export function EscalationStepTimeline({ stepResults, t }: EscalationStepTimelineProps) {
  if (stepResults.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium">{t('escalation.stepsTimeline')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stepResults.map((step) => (
          <div key={step.step} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {t('escalation.step')} {step.step}
                </Badge>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {step.provider} / {step.model}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{step.latencyMs}ms</span>
                <Badge variant={step.passed ? 'default' : 'destructive'} className="text-xs">
                  {step.passed ? t('escalation.passed') : t('escalation.failed')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={Math.round(step.qualityScore * 100)} className="h-1.5 flex-1" />
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                {Math.round(step.qualityScore * 100)}%
              </span>
            </div>
            {step.errorMessage !== null ? (
              <p className="text-xs text-destructive">{step.errorMessage}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
