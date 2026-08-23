'use client';

import { Globe } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RESEARCH_PROVIDER_LABELS, RESEARCH_MODES } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useTranslation } from '@/lib/i18n';
import type { ResearchToggleProps } from '@/types';
import { getProviderPlaceholder } from '@/utilities';

export function ResearchToggle({
  value,
  providers,
  isProvidersLoading = false,
  onChange,
  disabled,
}: ResearchToggleProps): React.ReactElement {
  const { t } = useTranslation();
  const selectableProviders = providers.filter((provider) => provider.enabled);
  const providerValue = value.providerId ?? 'auto';
  // No longer dims based on `value.mode === OFF`. Plan-feature gating happens
  // one level up (MessageComposer hides the whole control when the plan does
  // not unlock research). The provider dropdown stays enabled as long as the
  // composer isn't busy AND there is at least one provider to pick.
  const providerDisabled = disabled || selectableProviders.length === 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
      <Globe
        className={
          value.mode === ResearchMode.NONE ? 'text-muted-foreground size-4' : 'text-primary size-4'
        }
        aria-hidden
      />
      <Select
        value={value.mode}
        onValueChange={(next) => onChange({ ...value, mode: next as ResearchMode })}
        disabled={disabled}
      >
        <SelectTrigger className="truncate-fixed h-9 min-w-0 flex-1 px-2 text-xs sm:w-[10rem] sm:flex-none">
          <SelectValue placeholder={t('research.toggle.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {RESEARCH_MODES.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-xs"
              title={t(option.tooltipKey)}
            >
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* The provider picker only matters once research is actually on — hiding
          it otherwise saves the ~10rem it needs, which is most of why this row
          used to overflow into a horizontal-scroll strip on mobile.
          Both triggers take a fixed width from sm up and shrink below it, and
          trim their value either way. They used to hold a minimum with no
          maximum, so "Google / SerpAPI (Google / SerpAPI)" grew one trigger to
          409px, pushed the preview button onto a second row and wrapped inside
          a 36px control. Nothing is hidden by trimming: the menu that opens on
          click lists every provider in full. */}
      {value.mode !== ResearchMode.NONE ? (
        <Select
          value={providerValue}
          onValueChange={(next) =>
            onChange({ ...value, providerId: next === 'auto' ? undefined : next })
          }
          disabled={providerDisabled}
        >
          <SelectTrigger className="truncate-fixed h-9 min-w-0 flex-1 px-2 text-xs sm:w-[12rem] sm:flex-none">
            <SelectValue
              placeholder={getProviderPlaceholder(
                isProvidersLoading,
                selectableProviders.length,
                t,
              )}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto" className="text-xs">
              {t('research.toggle.autoProvider')}
            </SelectItem>
            {selectableProviders.map((provider) => (
              <SelectItem key={provider.id} value={provider.id} className="text-xs">
                {provider.name} ({RESEARCH_PROVIDER_LABELS[provider.kind] ?? provider.kind})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
