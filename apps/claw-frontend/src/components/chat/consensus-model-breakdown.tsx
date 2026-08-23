'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsensusModelStatus } from '@/enums';
import type { ConsensusModelBreakdownProps } from '@/types/component.types';

function StatusIcon({ status }: { status: ConsensusModelStatus }) {
  if (status === ConsensusModelStatus.COMPLETED) {
    return <CheckCircle2 className="text-success h-3.5 w-3.5" />;
  }
  if (status === ConsensusModelStatus.TIMEOUT) {
    return <Clock className="text-warning h-3.5 w-3.5" />;
  }
  return <XCircle className="text-destructive h-3.5 w-3.5" />;
}

export function ConsensusModelBreakdown({ breakdown, t }: ConsensusModelBreakdownProps) {
  if (breakdown.length === 0) {
    return null;
  }

  const getStatusLabel = (status: ConsensusModelStatus): string => {
    if (status === ConsensusModelStatus.COMPLETED) {
      return t('consensus.completed');
    }
    if (status === ConsensusModelStatus.TIMEOUT) {
      return t('consensus.timeout');
    }
    return t('consensus.failed');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('consensus.modelBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {breakdown.map((item) => (
            <div
              key={`${item.provider}/${item.model}`}
              className="bg-muted/40 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs"
            >
              <StatusIcon status={item.status} />
              <span className="font-medium">{item.model}</span>
              <Badge variant="outline" className="touch:text-xs text-[10px]">
                {getStatusLabel(item.status)}
              </Badge>
              {item.status === ConsensusModelStatus.COMPLETED ? (
                <span className="text-muted-foreground">
                  {t('consensus.contentLength')}: {item.contentLength}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
