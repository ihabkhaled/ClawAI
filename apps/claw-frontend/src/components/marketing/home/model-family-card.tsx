'use client';

import { MODEL_ROSTER_CHIP_LIMIT } from '@/constants/marketing-home.constants';
import { useTranslation } from '@/lib/i18n';
import type { MarketingModelFamilyCardProps } from '@/types';

/**
 * One provider, and the models it really offers here.
 *
 * The card previously took a hand-written "family" carrying an editorial
 * strength line per vendor. That copy is gone with the constant it belonged
 * to: it described vendors rather than this deployment, and three of the six
 * families it described could not serve a single model. The honest replacement
 * is the count and a sample of real names.
 */
export function ModelFamilyCard({ provider }: MarketingModelFamilyCardProps): React.ReactElement {
  const { t } = useTranslation();
  const chips = provider.models.slice(0, MODEL_ROSTER_CHIP_LIMIT);

  return (
    <div className="border-border bg-card flex flex-col rounded-lg border p-5">
      <h3 className="text-foreground font-semibold">{provider.displayName}</h3>
      <p className="text-muted-foreground mt-1.5 flex-1 text-sm">
        {t('marketing.home.modelRoster.modelCount', { count: provider.modelCount })}
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((model) => (
          <li
            key={model.modelKey}
            className="border-border text-muted-foreground max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs"
          >
            {model.displayName}
          </li>
        ))}
      </ul>
    </div>
  );
}
