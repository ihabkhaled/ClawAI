import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COMPARE_RESEARCH_MODE_ICONS, COMPARE_RESEARCH_MODE_OPTIONS } from '@/constants';
import type { CompareResearchMode } from '@/enums';
import type { CompareResearchModeControlProps } from '@/types';

export function CompareResearchModeControl({
  value,
  onChange,
  t,
  disabled = false,
  lockedTooltipKey,
}: CompareResearchModeControlProps): React.ReactElement {
  const wrapperTooltip = disabled && lockedTooltipKey ? t(lockedTooltipKey) : undefined;
  return (
    <div
      className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4"
      title={wrapperTooltip}
      aria-disabled={disabled}
    >
      <div className="space-y-0.5">
        <label className="text-sm font-medium" htmlFor="compare-research-mode">
          {t('compare.research.label')}
        </label>
        <p className="text-xs text-muted-foreground">{t('compare.research.hint')}</p>
      </div>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as CompareResearchMode)}
        disabled={disabled}
      >
        <SelectTrigger id="compare-research-mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARE_RESEARCH_MODE_OPTIONS.map((option) => {
            const Icon = COMPARE_RESEARCH_MODE_ICONS[option.value];
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                title={t(option.tooltipKey)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {t(option.labelKey)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
