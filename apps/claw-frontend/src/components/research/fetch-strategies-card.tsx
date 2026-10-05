'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFetchStrategies } from '@/hooks/research/use-fetch-strategies';
import { useTranslation } from '@/lib/i18n';
import { describeFetchStrategy } from '@/utilities/narration.utility';

/**
 * Which tiers can read a page right now: "Available" or "Off". Lets an operator
 * tell a sidecar that is switched off from one that was simply not needed for a
 * given page (ADR-121). Hidden until the list loads and for non-admins.
 */
export function FetchStrategiesCard(): React.ReactElement | null {
  const { t } = useTranslation();
  const { strategies, isError } = useFetchStrategies();

  if (isError || strategies.length === 0) {
    return null;
  }
  const ordered = [...strategies].sort((a, b) => a.tier - b.tier);

  return (
    <Card className="max-w-full min-w-0 overflow-hidden" data-testid="fetch-strategies-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm">{t('narration.strategiesTitle')}</CardTitle>
        <p className="text-muted-foreground text-xs">{t('narration.strategiesDescription')}</p>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((strategy) => (
            <li
              key={strategy.kind}
              className="flex min-w-0 items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <span className="min-w-0 break-words">{describeFetchStrategy(strategy.kind, t)}</span>
              <Badge variant={strategy.enabled ? 'default' : 'outline'} className="shrink-0">
                {strategy.enabled ? t('narration.strategyAvailable') : t('narration.strategyOff')}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
