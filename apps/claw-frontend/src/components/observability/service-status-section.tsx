import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { ServiceStatusSectionProps } from '@/types';

import { ComponentStateBadge } from './component-state-badge';
import { ComponentStatusRow } from './component-status-row';
import { StatusIncidentList } from './status-incident-list';

/**
 * What is up now, and how reliably each part of the platform has answered
 * over 24 h / 7 d / 30 d (observability plan B3). Coarse components only:
 * the API never names a service, host or port.
 */
export function ServiceStatusSection({ status, isLoading, isError }: ServiceStatusSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-6" data-testid="service-status-section">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg leading-none font-semibold tracking-tight">
            {t('observability.status.title')}
          </h2>
          <CardDescription>{t('observability.status.description')}</CardDescription>
        </div>
        {status ? (
          <div className="flex items-center gap-2 sm:shrink-0">
            <span className="text-muted-foreground text-sm">
              {t('observability.status.overallLabel')}
            </span>
            <ComponentStateBadge state={status.overall} />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingSpinner label={t('observability.status.loading')} /> : null}
        {!isLoading && (isError || !status) ? (
          <p role="alert" className="text-muted-foreground text-sm">
            {t('observability.status.failedToLoad')}
          </p>
        ) : null}
        {!isLoading && !isError && status ? (
          <>
            {status.historyAvailable ? null : (
              <p role="status" className="text-muted-foreground mb-4 rounded-md border p-3 text-sm">
                {t('observability.status.historyUnavailable')}
              </p>
            )}
            <ul className="divide-y">
              {status.components.map((entry) => (
                <ComponentStatusRow key={entry.component} entry={entry} />
              ))}
            </ul>
            {status.historyAvailable ? <StatusIncidentList incidents={status.incidents} /> : null}
            <p className="text-muted-foreground mt-4 text-xs">
              {t('observability.status.resolution')}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
