'use client';

import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VerifyResultCardProps } from '@/types';

// Result card rendered in the verify lab page's `resultSlot`. Matches the
// visual language of the other orchestration result cards
// (RolePackResultCard, CostEnsembleResultCard …) — pill badges in the
// header, monospace content in a muted-bg block, and a "view in thread"
// button so the user can drop into the full conversation if they want
// to follow up.
//
// Issues are rendered as a bulleted list of warnings; the section is
// omitted entirely when the verifier returned zero issues so we don't
// show an awkward "Issues" heading with nothing under it.
export function VerifyResultCard({
  result,
  onViewInThread,
  t,
}: VerifyResultCardProps): React.ReactElement {
  const scorePercent = Math.round(result.metadata.verifierScore * 100);
  const hasIssues = result.metadata.verifierIssues.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('verify.verified')}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {t('verify.verifierScore')}: {scorePercent}%
            </Badge>
            <Badge variant="outline">
              {t('verify.revisions')}: {String(result.metadata.revisionCount)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
          {result.content}
        </div>

        {hasIssues ? (
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
            <ExternalLink className="me-2 h-3 w-3" aria-hidden="true" />
            {t('verify.viewInThread')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
