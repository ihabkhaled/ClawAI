'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { RuntimeRawEventsDrawer } from '@/components/chat/runtime-progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RUNTIME_PROBE_MODELS_PREVIEW_LIMIT, RUNTIME_PROBE_RECENT_EVENTS_LIMIT } from '@/constants';
import { RuntimeProbeStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeProbeCardProps } from '@/types';

import { RuntimeProbeCapabilitiesList } from './RuntimeProbeCapabilitiesList';
import { RuntimeProbeEventRow } from './RuntimeProbeEventRow';
import { RuntimeProbeModelRow } from './RuntimeProbeModelRow';
import { RuntimeProbeStatusIcon } from './RuntimeProbeStatusIcon';

// Per-runtime probe card on the admin diagnostics page. Renders a status
// badge, URL, version, latency, capabilities checklist, collapsible models
// list, and a recent-events table. Embeds the dev-only
// RuntimeRawEventsDrawer at the bottom so an admin can spot-check the raw
// event stream the runtime is forwarding into the chat pipeline.
//
// All field access is null-safe — the probe response is sparse by design so
// every field (latencyMs, version, capabilities, models, recentEvents) may
// be undefined. The card stays useful even for an UNREACHABLE runtime that
// only reports status + url + error message.
export function RuntimeProbeCard({
  titleKey,
  report,
  isLoading,
  error,
  isDisabled,
  onRefresh,
}: RuntimeProbeCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [isRawOpen, setIsRawOpen] = useState(false);

  const statusKey =
    report?.status !== undefined
      ? `runtimeProgress.diagnostics.status.${report.status}`
      : 'runtimeProgress.diagnostics.status.UNKNOWN';

  const models = report?.models ?? [];
  const visibleModels = models.slice(0, RUNTIME_PROBE_MODELS_PREVIEW_LIMIT);
  const events = report?.recentEvents ?? [];
  const visibleEvents = events.slice(-RUNTIME_PROBE_RECENT_EVENTS_LIMIT).reverse();

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <RuntimeProbeStatusIcon status={report?.status} />
              <span>{t(titleKey)}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={cn(
                  report?.status === RuntimeProbeStatus.REACHABLE &&
                    'border-emerald-500 text-emerald-600 dark:text-emerald-400',
                  report?.status === RuntimeProbeStatus.DEGRADED &&
                    'border-amber-500 text-amber-600 dark:text-amber-400',
                  report?.status === RuntimeProbeStatus.UNREACHABLE &&
                    'border-destructive text-destructive',
                  report?.status === RuntimeProbeStatus.BINARY_MISSING &&
                    'border-destructive text-destructive',
                  report?.status === RuntimeProbeStatus.AUTH_REQUIRED &&
                    'border-amber-500 text-amber-600 dark:text-amber-400',
                )}
              >
                {t(statusKey)}
              </Badge>
              {report?.version !== undefined && report.version.length > 0 ? (
                <span className="text-muted-foreground">
                  {t('runtimeProgress.diagnostics.version')}: {report.version}
                </span>
              ) : null}
              {report?.latencyMs !== undefined ? (
                <span className="text-muted-foreground">
                  {t('runtimeProgress.diagnostics.latency')}: {report.latencyMs}ms
                </span>
              ) : null}
              {report?.executionProfile !== undefined ? (
                <span className="text-muted-foreground">
                  {t('runtimeProgress.diagnostics.executionProfile')}: {report.executionProfile}
                </span>
              ) : null}
            </div>
          </div>
          {!isDisabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={t('runtimeProgress.diagnostics.refresh')}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
                aria-hidden="true"
              />
              <span className="ml-1.5">{t('runtimeProgress.diagnostics.refresh')}</span>
            </Button>
          ) : null}
        </div>
        {report?.runtimeUrl !== undefined && report.runtimeUrl.length > 0 ? (
          <p className="text-muted-foreground mt-2 font-mono text-[11px] break-all">
            {t('runtimeProgress.diagnostics.runtimeUrl')}: {report.runtimeUrl}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        {isDisabled ? (
          <p
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300"
            role="status"
          >
            {t('runtimeProgress.diagnostics.serviceDisabled')}
          </p>
        ) : null}

        {!isDisabled ? (
          <>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t('runtimeProgress.diagnostics.loading')}
              </p>
            ) : null}

            {error !== null ? (
              <p
                className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
                role="alert"
              >
                {error.message || t('runtimeProgress.diagnostics.error')}
              </p>
            ) : null}

            {report?.errorMessage !== undefined && report.errorMessage.length > 0 ? (
              <p
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
                role="alert"
              >
                {report.errorMessage}
              </p>
            ) : null}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                {t('runtimeProgress.diagnostics.capabilitiesTitle')}
              </h3>
              <RuntimeProbeCapabilitiesList capabilities={report?.capabilities} />
            </section>

            <details className="group border-border/60 bg-muted/30 rounded-lg border px-3 py-2">
              <summary className="text-foreground cursor-pointer list-none text-sm font-semibold">
                {t('runtimeProgress.diagnostics.modelsTitle')} ({models.length})
              </summary>
              <div className="mt-2 flex flex-col gap-1">
                {visibleModels.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    {t('runtimeProgress.diagnostics.modelsEmpty')}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {visibleModels.map((model) => (
                      <RuntimeProbeModelRow
                        key={model.id}
                        model={model}
                        isActive={model.id === report?.activeModelId}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </details>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                {t('runtimeProgress.diagnostics.recentEventsTitle')}
              </h3>
              {visibleEvents.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  {t('runtimeProgress.diagnostics.recentEventsEmpty')}
                </p>
              ) : (
                <div className="border-border/60 overflow-x-auto rounded-lg border">
                  <table className="w-full table-fixed text-left">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-muted-foreground px-2 py-1 text-[10px] font-medium tracking-wide uppercase">
                          {t('runtimeProgress.diagnostics.recentEventsTime')}
                        </th>
                        <th className="text-muted-foreground px-2 py-1 text-[10px] font-medium tracking-wide uppercase">
                          {t('runtimeProgress.diagnostics.recentEventsType')}
                        </th>
                        <th className="text-muted-foreground px-2 py-1 text-[10px] font-medium tracking-wide uppercase">
                          {t('runtimeProgress.diagnostics.recentEventsModel')}
                        </th>
                        <th className="text-muted-foreground px-2 py-1 text-right text-[10px] font-medium tracking-wide uppercase">
                          {t('runtimeProgress.diagnostics.recentEventsDuration')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEvents.map((event, index) => (
                        <RuntimeProbeEventRow
                          key={`${String(event.atMs)}:${event.type}:${String(index)}`}
                          event={event}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <RuntimeRawEventsDrawer events={[]} isOpen={isRawOpen} onToggle={setIsRawOpen} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
