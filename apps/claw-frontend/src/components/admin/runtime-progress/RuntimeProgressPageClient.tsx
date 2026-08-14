'use client';

import { RefreshCw } from 'lucide-react';
import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { RuntimeProbeCard } from '@/components/admin/runtime-progress/RuntimeProbeCard';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums';
import { useRuntimeProgressPage } from '@/hooks/admin/use-runtime-progress-page';
import { cn } from '@/lib/utils';
import type { RuntimeProgressPageClientProps } from '@/types';

export function RuntimeProgressPageClient({
  localAiEnabled,
}: RuntimeProgressPageClientProps): ReactElement {
  const { t, user, ollama, llamacpp, lastUpdatedAt, isRefreshing, onRefreshAll } =
    useRuntimeProgressPage(localAiEnabled);

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  const lastUpdatedLabel =
    lastUpdatedAt === null
      ? t('runtimeProgress.diagnostics.lastUpdatedNever')
      : t('runtimeProgress.diagnostics.lastUpdatedAt', {
          time: new Date(lastUpdatedAt).toLocaleTimeString(),
        });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={t('runtimeProgress.diagnostics.title')}
          description={t('runtimeProgress.diagnostics.description')}
        />
        {localAiEnabled ? (
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              aria-label={t('runtimeProgress.diagnostics.refreshAll')}
            >
              <RefreshCw
                className={cn('mr-1.5 h-4 w-4', isRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              {t('runtimeProgress.diagnostics.refreshAll')}
            </Button>
            <span className="text-muted-foreground text-[11px]">{lastUpdatedLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RuntimeProbeCard
          titleKey="runtimeProgress.diagnostics.ollamaTitle"
          report={ollama.data}
          isLoading={ollama.isLoading}
          error={ollama.error}
          isDisabled={!localAiEnabled}
          onRefresh={ollama.onRefresh}
        />
        <RuntimeProbeCard
          titleKey="runtimeProgress.diagnostics.llamacppTitle"
          report={llamacpp.data}
          isLoading={llamacpp.isLoading}
          error={llamacpp.error}
          isDisabled={!localAiEnabled}
          onRefresh={llamacpp.onRefresh}
        />
      </div>
    </div>
  );
}
