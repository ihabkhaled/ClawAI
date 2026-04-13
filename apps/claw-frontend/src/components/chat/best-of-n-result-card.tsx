import { ExternalLink } from 'lucide-react';

import { CandidateCard } from '@/components/chat/candidate-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BestOfNResultCardProps } from '@/types';

export function BestOfNResultCard({ result, onViewInThread, t }: BestOfNResultCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('bestOfN.resultTitle')}</CardTitle>
            <Button variant="outline" size="sm" onClick={onViewInThread}>
              <ExternalLink className="me-2 h-3 w-3" />
              {t('bestOfN.viewInThread')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{result.content}</p>
        </CardContent>
      </Card>

      {result.metadata.candidates.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('bestOfN.candidatesHeader')}
          </h3>
          {result.metadata.candidates.map((candidate) => (
            <CandidateCard
              key={`${candidate.model}-${String(candidate.rank)}`}
              candidate={candidate}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
