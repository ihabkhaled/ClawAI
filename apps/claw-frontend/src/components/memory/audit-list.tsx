'use client';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { AuditListProps } from '@/types/component.types';
import { formatDate } from '@/utilities';

export function AuditList(props: AuditListProps): React.ReactElement {
  const { entries, isLoading } = props;
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner label={t('memory.loadingAudit')} />;
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          {t('memory.noAudit')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {entry.action}
              </Badge>
              {entry.memoryId ? (
                <span className="text-muted-foreground font-mono text-xs">{entry.memoryId}</span>
              ) : (
                <span className="text-muted-foreground text-xs italic">
                  {t('memory.auditNoMemoryId')}
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{formatDate(entry.createdAt)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
