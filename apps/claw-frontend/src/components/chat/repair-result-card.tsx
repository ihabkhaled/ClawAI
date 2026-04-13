'use client';

import { ExternalLink } from 'lucide-react';

import type { RepairResultCardProps } from '@/types';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function RepairResultCard({
  result,
  onViewInThread,
  t,
}: RepairResultCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t('repair.resultTitle')}</CardTitle>
          <Button variant="outline" size="sm" onClick={onViewInThread}>
            <ExternalLink className="me-2 h-3 w-3" />
            {t('repair.viewInThread')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {result.metadata.repairTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('repair.provider')}: {result.metadata.repairProvider} &middot; {t('repair.model')}:{' '}
          {result.metadata.repairModel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="whitespace-pre-wrap text-sm">{result.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
