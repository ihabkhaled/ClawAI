import type { LiveUsageCardProps } from '@/types/live.types';
import { formatMicroUsd } from '@/utilities/credit.utility';
import { liveFreeSecondsLeft, liveSecondsToWholeMinutes } from '@/utilities/live-request.utility';

/** Free minutes left this month and the paid price per minute (`GET /live/usage`). */
export function LiveUsageCard({ usage, t, locale }: LiveUsageCardProps): React.ReactElement {
  return (
    <section
      aria-label={t('live.usage.title')}
      className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4"
      data-testid="live-usage-card"
    >
      <h2 className="text-foreground text-sm font-semibold">{t('live.usage.title')}</h2>
      {usage.isLoading ? (
        <p className="text-muted-foreground text-sm">{t('live.usage.loading')}</p>
      ) : null}
      {usage.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {t('live.usage.error')}
        </p>
      ) : null}
      {usage.usage ? (
        <>
          <p className="text-foreground text-2xl font-semibold">
            {t('live.usage.freeLeft', {
              minutes: liveSecondsToWholeMinutes(liveFreeSecondsLeft(usage.usage)),
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('live.usage.freeOfTotal', {
              total: liveSecondsToWholeMinutes(usage.usage.freeSecondsTotal),
            })}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('live.usage.pricePerMinute', {
              price: formatMicroUsd(usage.usage.paidMicroUsdPerMinute, locale),
            })}
          </p>
        </>
      ) : null}
    </section>
  );
}
