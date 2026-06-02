'use client';

import { ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeVariant, ConsensusConfidenceLevel } from '@/enums';
import type { ConsensusSynthesisCardProps } from '@/types/component.types';

export function ConsensusSynthesisCard({
  synthesis,
  onViewInThread,
  t,
}: ConsensusSynthesisCardProps) {
  const getConfidenceVariant = (): BadgeVariant => {
    if (synthesis.confidenceLevel === ConsensusConfidenceLevel.HIGH) {
      return BadgeVariant.DEFAULT;
    }
    if (synthesis.confidenceLevel === ConsensusConfidenceLevel.MEDIUM) {
      return BadgeVariant.SECONDARY;
    }
    return BadgeVariant.OUTLINE;
  };

  const getConfidenceLabel = (): string => {
    if (synthesis.confidenceLevel === ConsensusConfidenceLevel.HIGH) {
      return t('consensus.high');
    }
    if (synthesis.confidenceLevel === ConsensusConfidenceLevel.MEDIUM) {
      return t('consensus.medium');
    }
    return t('consensus.low');
  };

  const confidenceVariant = getConfidenceVariant();
  const confidenceLabel = getConfidenceLabel();

  const scorePercent = Math.round(synthesis.agreementScore * 100);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('consensus.synthesisTitle')}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={confidenceVariant}>
              {t('consensus.confidenceLevel')}: {confidenceLabel}
            </Badge>
            <Badge variant="secondary">
              {t('consensus.agreementScore')}: {scorePercent}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{synthesis.finalAnswer}</p>

        {synthesis.agreements.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t('consensus.agreements')}</p>
            <ul className="space-y-1">
              {synthesis.agreements.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {synthesis.disagreements.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('consensus.disagreements')}
            </p>
            <ul className="space-y-1">
              {synthesis.disagreements.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {synthesis.contradictions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('consensus.contradictions')}
            </p>
            <ul className="space-y-1">
              {synthesis.contradictions.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {synthesis.synthesisRationale ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{t('consensus.synthesisRationaleLabel')}: </span>
            {synthesis.synthesisRationale}
          </p>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onViewInThread}>
            {t('consensus.viewInThread')}
            <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
