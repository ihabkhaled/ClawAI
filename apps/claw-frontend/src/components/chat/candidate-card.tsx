import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CandidateCardProps } from '@/types';

export function CandidateCard({ candidate, t }: CandidateCardProps) {
  const scorePercent = Math.round(candidate.qualityScore * 100);

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {t('bestOfN.rank')} #{String(candidate.rank)} — {candidate.model}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">
              {t('bestOfN.score')}: {String(scorePercent)}%
            </Badge>
            <Badge variant="secondary">
              {t('bestOfN.latency')}: {String(candidate.latencyMs)}ms
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-foreground">{candidate.content}</p>
      </CardContent>
    </Card>
  );
}
