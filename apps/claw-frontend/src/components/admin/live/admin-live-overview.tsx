import { AdminLiveRunsTable } from '@/components/admin/live/admin-live-runs-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LIVE_ADMIN_DAYS_OPTIONS } from '@/constants/live.constants';
import type { AdminLiveSectionProps } from '@/types/live-admin.types';
import { formatMicroUsd } from '@/utilities/credit.utility';

/** Streams, viewers, latency and money for the chosen period, plus the active runs. */
export function AdminLiveOverview({ controller }: AdminLiveSectionProps): React.ReactElement {
  const { t, locale, overview } = controller;
  return (
    <section aria-labelledby="admin-live-overview" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-live-overview" className="text-foreground text-base font-semibold">
          {t('live.admin.runsTitle')}
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="admin-live-days" className="text-foreground text-sm">
            {t('live.admin.periodLabel')}
          </label>
          <Select
            name="admin-live-days"
            value={String(controller.days)}
            onValueChange={(value) => controller.setDays(Number(value))}
          >
            <SelectTrigger id="admin-live-days" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIVE_ADMIN_DAYS_OPTIONS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {t('live.admin.periodDays', { days })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {controller.isOverviewLoading ? (
        <p className="text-muted-foreground text-sm">{t('live.admin.loading')}</p>
      ) : null}
      {controller.isOverviewError ? (
        <div role="alert" className="text-destructive flex items-center justify-between gap-3">
          <span className="text-sm">{t('live.admin.error')}</span>
          <Button variant="outline" size="sm" onClick={controller.retryOverview}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      {overview ? (
        <>
          <dl
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
            data-testid="admin-live-cards"
          >
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.activeStreams')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {overview.totals.activeRuns}
              </dd>
            </div>
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.activeViewers')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {overview.totals.activeViewers}
              </dd>
            </div>
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.latency')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {overview.ai.sttP95Ms === null
                  ? t('live.admin.notMeasured')
                  : t('live.admin.latencyValue', { ms: overview.ai.sttP95Ms })}
              </dd>
            </div>
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.providerCost')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {formatMicroUsd(overview.money.providerCostMicroUsd, locale)}
              </dd>
            </div>
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.revenue')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {formatMicroUsd(overview.money.revenueMicroUsd, locale)}
              </dd>
            </div>
            <div className="border-border bg-card rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs">{t('live.admin.margin')}</dt>
              <dd className="text-foreground text-xl font-semibold">
                {formatMicroUsd(overview.money.grossMarginMicroUsd, locale)}
              </dd>
            </div>
          </dl>
          <AdminLiveRunsTable controller={controller} />
        </>
      ) : null}
      <ConfirmDialog
        open={controller.stopRunId !== null}
        onOpenChange={(open) => (open ? undefined : controller.askStopRun(null))}
        title={t('live.admin.stopTitle')}
        description={t('live.admin.stopDescription')}
        confirmLabel={t('live.admin.stop')}
        cancelLabel={t('live.admin.cancel')}
        onConfirm={controller.confirmStopRun}
        isConfirming={controller.pendingRunId !== null}
      />
    </section>
  );
}
