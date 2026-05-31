'use client';

import { Brain, Cloud, CloudOff } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useActivityMemoryPage } from '@/hooks/agent/use-activity-memory-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentActivityMemoryPage(): ReactElement {
  const { t } = useTranslation();
  const { entries, total, isLoading, isError, error } = useActivityMemoryPage();

  if (isError) {
    return (
      <div>
        <PageHeader title={t('agent.activityMemory')} description={t('agent.activityMemoryDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('agent.activityMemory')}
        description={t('agent.activityMemoryDesc')}
        actions={<span className="text-xs text-muted-foreground">{total} entries (cloud)</span>}
      />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && entries.length === 0 && (
        <EmptyState
          icon={Brain}
          title={t('agent.noActivity')}
          description={t('agent.noActivityDesc')}
        />
      )}

      {!isLoading && entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center gap-3 py-2">
                {e.syncedToCloud ? (
                  <Cloud className="size-4 text-green-500" />
                ) : (
                  <CloudOff className="size-4 text-muted-foreground" />
                )}
                <Badge variant="outline" className="font-mono text-xs">
                  {e.kind}
                </Badge>
                <span className="flex-1 truncate text-xs">{e.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.occurredAt).toLocaleString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
