import { ModelPicker } from '@/components/chat/model-picker';
import { Button } from '@/components/ui/button';
import { useLiveCardEnhance } from '@/hooks/live/use-live-card-enhance';
import type { LiveCardEventProps } from '@/types/live.types';
import { formatMicroUsd } from '@/utilities/credit.utility';

/** Pick a model, see the estimated cost, then confirm. Nothing is charged before the confirm. */
export function LiveCardEnhancePanel({
  eventId,
  t,
  locale,
}: LiveCardEventProps): React.ReactElement {
  const enhance = useLiveCardEnhance(eventId);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm font-semibold">{t('live.card.enhanceTitle')}</p>
      <ModelPicker
        id={`live-enhance-${eventId}`}
        groups={enhance.groups}
        value={enhance.modelValue}
        onChange={enhance.setModelValue}
        isLoading={enhance.isLoadingModels}
        placeholder={t('live.card.pickModel')}
        loadingPlaceholder={t('live.card.loadingModels')}
        emptyPlaceholder={t('live.card.noModels')}
        searchPlaceholder={t('common.search')}
        noResultsLabel={t('common.noResults')}
        ariaLabel={t('live.card.pickModel')}
      />
      {enhance.estimateMicroUsd === null ? (
        <Button
          variant="outline"
          onClick={enhance.estimate}
          disabled={enhance.modelValue === null}
          isLoading={enhance.isEstimating}
        >
          {t('live.card.getEstimate')}
        </Button>
      ) : (
        <>
          <p className="text-foreground text-sm" data-testid="live-enhance-estimate">
            {t('live.card.estimate', { price: formatMicroUsd(enhance.estimateMicroUsd, locale) })}
          </p>
          <Button onClick={enhance.confirm} isLoading={enhance.isEnhancing}>
            {t('live.card.confirmEnhance')}
          </Button>
        </>
      )}
      {enhance.content ? (
        <div className="border-border flex flex-col gap-1 border-t pt-2">
          <p className="text-muted-foreground text-xs">{t('live.card.enhanced')}</p>
          <p className="text-foreground text-sm whitespace-pre-line" dir="auto">
            {enhance.content}
          </p>
        </div>
      ) : null}
    </div>
  );
}
