'use client';

import { RecoveryFallbackRow } from '@/components/routing/recovery-fallback-row';
import { RecoveryProviderTable } from '@/components/routing/recovery-provider-table';
import { RecoveryStatsCard } from '@/components/routing/recovery-stats-card';
import { useRecoveryPage } from '@/hooks/routing/use-recovery-page';

export default function RecoveryPage(): React.ReactElement {
  const { t, data, isLoading, isError } = useRecoveryPage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t('recovery.loading')}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive">
        {t('recovery.error')}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('recovery.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('recovery.description')}</p>
      </div>

      <RecoveryStatsCard
        totalDecisions={data.totalDecisions}
        totalWithFallback={data.totalWithFallback}
        fallbackRate={data.fallbackRate}
        t={t}
      />

      <div>
        <h2 className="mb-3 text-lg font-medium">{t('recovery.providerTable')}</h2>
        <RecoveryProviderTable providerStats={data.providerStats} t={t} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t('recovery.recentFallbacks')}</h2>
        {data.recentFallbacks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('recovery.noFallbacks')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.originalProvider')}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.originalModel')}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.fallbackProvider')}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.fallbackModel')}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.mode')}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t('recovery.time')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentFallbacks.map((fallback) => (
                  <RecoveryFallbackRow key={fallback.id} fallback={fallback} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
