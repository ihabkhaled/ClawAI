import { PauseCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SkippedProvidersCardProps } from '@/types/provider-breaker.types';

// Admin-only: providers AUTO is skipping because the account ran out of
// credit (ADR-125 addendum), with a manual clear. Render-only.
export function SkippedProvidersCard({
  rows,
  isLoading,
  isError,
  isPartial,
  clearingProvider,
  onClear,
  t,
}: SkippedProvidersCardProps): React.ReactElement {
  return (
    <Card className="mb-6" data-testid="skipped-providers">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PauseCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t('skippedProviders.title')}
        </CardTitle>
        <CardDescription>{t('skippedProviders.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isPartial ? (
          <p className="text-warning text-sm" role="status">
            {t('skippedProviders.partial')}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('skippedProviders.loading')}</p>
        ) : null}
        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('skippedProviders.error')}
          </p>
        ) : null}
        {!isLoading && !isError && rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('skippedProviders.empty')}</p>
        ) : null}
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.provider}
                className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground text-xs">
                      {t('skippedProviders.provider')}
                    </dt>
                    <dd className="font-medium break-words">{row.provider}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground text-xs">
                      {t('skippedProviders.connectors')}
                    </dt>
                    <dd className="break-words">{row.connectorLabel}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground text-xs">
                      {t('skippedProviders.reason')}
                    </dt>
                    <dd className="break-words">{row.reasonLabel}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground text-xs">
                      {t('skippedProviders.skippedUntil')}
                    </dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      <bdi>{row.skippedUntilLabel}</bdi>
                      {row.probing ? (
                        <Badge variant="secondary">{t('skippedProviders.probing')}</Badge>
                      ) : null}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start sm:self-center"
                  disabled={clearingProvider !== null}
                  onClick={() => onClear(row.provider)}
                  aria-label={t('skippedProviders.clearProvider', { provider: row.provider })}
                >
                  {clearingProvider === row.provider
                    ? t('skippedProviders.clearing')
                    : t('skippedProviders.clear')}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
