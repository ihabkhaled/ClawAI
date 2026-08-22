'use client';

import { RecoveryFallbackTable } from '@/components/routing/recovery-fallback-table';
import { RecoveryProviderTable } from '@/components/routing/recovery-provider-table';
import { RecoveryStatsCard } from '@/components/routing/recovery-stats-card';
import { useRecoveryPage } from '@/hooks/routing/use-recovery-page';

export default function RecoveryPage(): React.ReactElement {
  const { t, data, isLoading, isError } = useRecoveryPage();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-16">
        {t('recovery.loading')}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive flex items-center justify-center py-16">
        {t('recovery.error')}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('recovery.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('recovery.description')}</p>
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
        <RecoveryFallbackTable recentFallbacks={data.recentFallbacks} t={t} />
      </div>
    </div>
  );
}
