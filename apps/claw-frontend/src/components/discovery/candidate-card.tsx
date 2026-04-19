'use client';

import { Check, ShieldCheck, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DiscoveryCandidateCardProps } from '@/types';
import { formatModelSize } from '@/utilities/model-size.utility';

export function CandidateCard({
  candidate,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
  t,
}: DiscoveryCandidateCardProps): React.ReactElement {
  const confidencePercent = Math.round(candidate.confidence * 100);
  const isPending = candidate.status === 'PENDING';

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <div className="flex-1">
          <CardTitle className="text-base">{candidate.displayName}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{candidate.ollamaName}</p>
        </div>
        <Badge
          variant={candidate.downloadStatus === 'AVAILABLE' ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {candidate.downloadStatus}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        {candidate.description !== null && candidate.description.length > 0 ? (
          <p className="line-clamp-3 text-muted-foreground">{candidate.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{candidate.suggestedCategory}</Badge>
          {candidate.businessCategories.slice(0, 3).map((b) => (
            <Badge key={b} variant="outline" className="text-xs">
              {b}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {t('discovery.candidate.size')}: {formatModelSize(candidate.sizeBytes)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            {t('discovery.candidate.confidence')}: {confidencePercent}%
          </span>
          {candidate.hardwareProfiles.length > 0 ? (
            <>
              <span>•</span>
              <span>{candidate.hardwareProfiles.slice(0, 2).join(', ')}</span>
            </>
          ) : null}
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            disabled={!isPending || isApprovePending || isRejectPending}
            onClick={() => onApprove(candidate.id)}
          >
            <Check className="h-4 w-4" />
            {t('discovery.actions.approve')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!isPending || isApprovePending || isRejectPending}
            onClick={() => onReject(candidate.id, 'Admin rejection')}
          >
            <X className="h-4 w-4" />
            {t('discovery.actions.reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
