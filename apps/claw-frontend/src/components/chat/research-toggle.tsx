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
    <div className="flex items-center gap-1">
      <Globe
        className={
          value.mode === ResearchMode.NONE ? 'size-4 text-muted-foreground' : 'size-4 text-primary'
        }
        aria-hidden
      />
      <Select
        value={value.mode}
        onValueChange={(next) => onChange({ ...value, mode: next as ResearchMode })}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 min-w-[9rem] px-2 text-xs">
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
      <Select
        value={providerValue}
        onValueChange={(next) =>
          onChange({ ...value, providerId: next === 'auto' ? undefined : next })
        }
        disabled={providerDisabled}
      >
        <SelectTrigger className="h-8 min-w-[10rem] px-2 text-xs">
          <SelectValue
            placeholder={getProviderPlaceholder(isProvidersLoading, selectableProviders.length, t)}
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
    </div>
  );
}
