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
    // `shrink-0`, not `flex-1`. These used to shrink below their content on a
    // phone, so the mode select rendered as "N…" in about 90px. The toolbar row
    // already scrolls sideways — that is the designed answer to a row that does
    // not fit, and it beats crushing every control until none of them is
    // readable.
    <div className="flex shrink-0 items-center gap-1">
      {/* Decorative and redundant: the select beside it says "No research" in
          words. It is worth 20px of a 375px row, which is the difference
          between the research control being readable and being clipped. */}
      <Globe
        className={
          value.mode === ResearchMode.NONE
            ? 'text-muted-foreground hidden size-4 sm:block'
            : 'text-primary hidden size-4 sm:block'
        }
        aria-hidden
      />
      <Select
        value={value.mode}
        onValueChange={(next) => onChange({ ...value, mode: next as ResearchMode })}
        disabled={disabled}
      >
        {/* A Radix Select trigger renders its VALUE, not a label, so without an
            aria-label a screen reader announces "No research, combobox" with
            no indication of what is being chosen. Lighthouse reported it as a
            button with no accessible name. */}
        <SelectTrigger
          aria-label={t('research.toggle.modeLabel')}
          className="truncate-fixed h-9 w-[8.5rem] shrink-0 px-2 text-xs sm:w-[10rem]"
        >
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
          <SelectTrigger
            aria-label={t('research.toggle.providerLabel')}
            className="truncate-fixed h-9 w-[9.5rem] shrink-0 px-2 text-xs sm:w-[12rem]"
          >
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
