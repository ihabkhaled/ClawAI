import type { RecoveryStatsCardProps } from '@/types';

export function RecoveryStatsCard({
  totalDecisions,
  totalWithFallback,
  fallbackRate,
  t,
}: RecoveryStatsCardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('recovery.totalDecisions')}</p>
        <p className="mt-1 text-2xl font-semibold">{totalDecisions.toLocaleString()}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('recovery.totalFallbacks')}</p>
        <p className="mt-1 text-2xl font-semibold">{totalWithFallback.toLocaleString()}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('recovery.fallbackRate')}</p>
        <p className="mt-1 text-2xl font-semibold">{(fallbackRate * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
