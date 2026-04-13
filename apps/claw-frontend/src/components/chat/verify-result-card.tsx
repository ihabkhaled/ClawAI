'use client';

import { CheckCircle, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VerifyResultCardProps } from '@/types';

export function VerifyResultCard({
  result,
  onViewInThread,
  t,
}: VerifyResultCardProps): React.ReactElement {
  const scorePercent = Math.round(result.metadata.verifierScore * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {t('verify.verified')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {t('verify.verifierScore')}: {scorePercent}%
            </Badge>
            <Badge variant="outline">
              {t('verify.revisions')}: {String(result.metadata.revisionCount)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{result.content}</div>

        {result.metadata.verifierIssues.length > 0 ? (
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">{t('verify.issues')}</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {result.metadata.verifierIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onViewInThread}>
            <ExternalLink className="me-2 h-3 w-3" />
            {t('verify.viewInThread')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
