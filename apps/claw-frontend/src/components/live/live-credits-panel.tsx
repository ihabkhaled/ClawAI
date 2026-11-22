import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiveCredits } from '@/hooks/live/use-live-credits';
import type { LiveCreditsPanelProps } from '@/types/live.types';
import { formatMicroUsd } from '@/utilities/credit.utility';

/** Free minutes are gone: paid minutes need an explicit approval, with an optional spending cap. */
export function LiveCreditsPanel({
  sessionId,
  usage,
  t,
  locale,
}: LiveCreditsPanelProps): React.ReactElement {
  const credits = useLiveCredits(sessionId);
  const price = usage === null ? '—' : formatMicroUsd(usage.paidMicroUsdPerMinute, locale);
  return (
    <section
      aria-labelledby="live-credits-title"
      className="border-warning bg-card flex flex-col gap-3 rounded-md border p-3"
      data-testid="live-credits-panel"
    >
      <h3 id="live-credits-title" className="text-foreground text-sm font-semibold">
        {t('live.credits.title')}
      </h3>
      <p className="text-foreground text-sm">{t('live.credits.description', { price })}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="live-credits-cap" className="text-foreground text-sm font-medium">
          {t('live.credits.capLabel')}
        </label>
        <Input
          id="live-credits-cap"
          name="live-credits-cap"
          inputMode="decimal"
          dir="ltr"
          value={credits.capUsd}
          aria-invalid={credits.capInvalid}
          aria-describedby="live-credits-cap-hint"
          onChange={(event) => credits.setCapUsd(event.target.value)}
        />
        <p id="live-credits-cap-hint" className="text-muted-foreground text-xs">
          {credits.capInvalid ? t('live.credits.capInvalid') : t('live.credits.capHint')}
        </p>
      </div>
      <Button
        onClick={credits.approve}
        disabled={credits.capInvalid}
        isLoading={credits.isApproving}
        className="self-start"
      >
        {t('live.credits.approve')}
      </Button>
    </section>
  );
}
