import { AlertTriangle, CheckCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ReplayNeedsReviewListProps } from '@/types';

import { ReplayOutcomeBadge } from './replay-outcome-badge';

export function ReplayNeedsReviewList({
  cases,
  onReview,
  isReviewPending,
  onPromote,
  isPromotePending,
  t,
}: ReplayNeedsReviewListProps): React.ReactElement {
  if (cases.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">{t('replay.noSuspiciousCases')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cases.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium" title={c.messagePreview}>
                {c.messagePreview || t('replay.noOriginalContent')}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.oldProvider}/{c.oldModel} → {c.newProvider}/{c.newModel}
              </p>
              <div className="flex flex-wrap gap-1">
                {c.suspiciousReasons.map((reason) => (
                  <Badge key={reason} variant="outline" className="text-xs">
                    {t(`replay.suspiciousReasons.${reason}` as Parameters<typeof t>[0])}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ReplayOutcomeBadge outcomeLabel={c.outcomeLabel} t={t} />
              {c.isConfirmedRegression ? (
                <>
                  <Badge variant="destructive">{t('replay.confirmedRegression')}</Badge>
                  {c.isPromoted ? (
                    <Badge variant="outline">{t('replay.promoted')}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPromote(c.id)}
                      disabled={isPromotePending}
                    >
                      {t('replay.promoteCase')}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReview(c.id, true, '')}
                  disabled={isReviewPending}
                >
                  {t('replay.markConfirmedRegression')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
