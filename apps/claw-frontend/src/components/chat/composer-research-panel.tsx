import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  COMPOSER_PLUS_ITEM_ATTRIBUTE,
  COMPOSER_PLUS_OPTION_CLASS,
} from '@/constants/composer-plus-menu.constants';
import { RESEARCH_MODES, RESEARCH_PROVIDER_LABELS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useTranslation } from '@/lib/i18n';
import type { ComposerResearchPanelProps } from '@/types/composer-plus-menu.types';
import { getProviderPlaceholder } from '@/utilities';

/**
 * Research mode and search provider as two radio lists. Shared by the toolbar chip's
 * popover and the "+" menu's Web research sub-panel, so both change the same state.
 * The provider list only appears once research is on.
 */
export function ComposerResearchPanel({
  value,
  providers,
  isProvidersLoading,
  onChange,
  disabled,
}: ComposerResearchPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const selectable = providers.filter((provider) => provider.enabled);
  const providerValue = value.providerId ?? 'auto';
  const providerDisabled = disabled || selectable.length === 0;

  return (
    <div className="flex flex-col gap-2 p-1">
      <div
        role="radiogroup"
        aria-label={t('research.toggle.modeLabel')}
        className="flex flex-col gap-0.5"
      >
        {RESEARCH_MODES.map((option) => {
          const selected = value.mode === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange({ ...value, mode: option.value })}
              className={COMPOSER_PLUS_OPTION_CLASS}
              {...{ [COMPOSER_PLUS_ITEM_ATTRIBUTE]: '' }}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-tight font-medium">{t(option.labelKey)}</span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {t(option.tooltipKey)}
                </span>
              </span>
              {selected ? (
                <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
              ) : null}
            </Button>
          );
        })}
      </div>
      {value.mode === ResearchMode.NONE ? null : (
        <div
          role="radiogroup"
          aria-label={t('research.toggle.providerLabel')}
          data-tour="composer-research-provider"
          className="flex flex-col gap-0.5 border-t pt-2"
        >
          <p className="text-muted-foreground px-2 pb-0.5 text-[11px] font-semibold tracking-wide uppercase">
            {t('research.toggle.providerLabel')}
          </p>
          {selectable.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1 text-xs">
              {getProviderPlaceholder(isProvidersLoading, selectable.length, t)}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            role="radio"
            aria-checked={providerValue === 'auto'}
            disabled={providerDisabled}
            onClick={() => onChange({ ...value, providerId: undefined })}
            className={COMPOSER_PLUS_OPTION_CLASS}
            {...{ [COMPOSER_PLUS_ITEM_ATTRIBUTE]: '' }}
          >
            <span className="min-w-0 flex-1 text-sm font-medium">
              {t('research.toggle.autoProvider')}
            </span>
            {providerValue === 'auto' ? (
              <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
            ) : null}
          </Button>
          {selectable.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={providerValue === provider.id}
              disabled={providerDisabled}
              onClick={() => onChange({ ...value, providerId: provider.id })}
              className={COMPOSER_PLUS_OPTION_CLASS}
              {...{ [COMPOSER_PLUS_ITEM_ATTRIBUTE]: '' }}
            >
              <span className="min-w-0 flex-1 text-sm font-medium">
                {provider.name} ({RESEARCH_PROVIDER_LABELS[provider.kind] ?? provider.kind})
              </span>
              {providerValue === provider.id ? (
                <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
              ) : null}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
