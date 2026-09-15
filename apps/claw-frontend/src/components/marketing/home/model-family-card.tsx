'use client';

import { ModelFamilyDialog } from '@/components/marketing/home/model-family-dialog';
import { Button } from '@/components/ui/button';
import { MODEL_ROSTER_CHIP_LIMIT } from '@/constants/marketing-home.constants';
import { useModelFamilyCard } from '@/hooks/marketing/use-model-family-card';
import { useTranslation } from '@/lib/i18n';
import type { MarketingModelFamilyCardProps } from '@/types';
import { sortCatalogModelsByRecency } from '@/utilities/public-models.utility';

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
  const { isOpen, open, setIsOpen } = useModelFamilyCard();
  // Newest first before slicing, or the sample is whatever sorts alphabetically
  // first — which for OpenAI was "Chatgpt Image Latest" and four flavours of
  // GPT 3.5 Turbo, on the page whose whole job is to say what you get.
  const chips = sortCatalogModelsByRecency(provider.provider, provider.models).slice(
    0,
    MODEL_ROSTER_CHIP_LIMIT,
  );

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

      {/* The card shows six names; this is how a visitor answers "is MY model
          on the list?" without leaving the page. Hidden when the sample
          already IS the whole list, so it never promises more than it opens. */}
      {provider.modelCount > chips.length ? (
        <Button
          type="button"
          variant="link"
          onClick={open}
          className="text-primary mt-4 h-auto self-start p-0 text-sm font-medium"
        >
          {t('marketing.home.modelRoster.showAllModels', { count: provider.modelCount })}
        </Button>
      ) : null}

      <ModelFamilyDialog provider={provider} open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
