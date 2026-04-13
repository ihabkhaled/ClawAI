import type { RecoveryProviderTableProps } from '@/types';

export function RecoveryProviderTable({ providerStats, t }: RecoveryProviderTableProps) {
  if (providerStats.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{t('recovery.noFallbacks')}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              {t('recovery.provider')}
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              {t('recovery.fallbackCount')}
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              {t('recovery.rate')}
            </th>
          </tr>
        </thead>
        <tbody>
          {providerStats.map((stat) => (
            <tr key={stat.provider} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{stat.provider}</td>
              <td className="px-4 py-2 text-right">{stat.fallbackCount}</td>
              <td className="px-4 py-2 text-right">{(stat.fallbackRate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
