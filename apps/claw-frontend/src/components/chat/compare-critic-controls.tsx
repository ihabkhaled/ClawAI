import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MODEL_AUTO_VALUE } from '@/constants';
import type { CompareCriticControlsProps } from '@/types';

// Sibling of CompareJudgeControls. Visually nested under the judge controls so
// the user reads it as "extra layer on top of judge". Parent decides whether to
// render at all (gated on plan feature + judgeEnabled), so this component stays
// a pure render of state + change handlers.
export function CompareCriticControls({
  criticEnabled,
  onCriticEnabledChange,
  criticModel,
  onCriticModelChange,
  criticModelOptions,
  criticModelOptionsLoading,
  criticEnablementDisabled = false,
  t,
}: CompareCriticControlsProps): React.ReactElement {
  return (
    <div className="border-border/60 bg-muted/10 ms-4 space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-sm font-medium" htmlFor="compare-critic-enabled">
            {t('compare.critic.enabled')}
          </label>
          <p className="text-muted-foreground text-xs">{t('compare.critic.enabledHint')}</p>
        </div>
        <Switch
          id="compare-critic-enabled"
          checked={criticEnabled}
          onCheckedChange={onCriticEnabledChange}
          disabled={criticEnablementDisabled}
        />
      </div>

      {criticEnabled ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('compare.critic.modelLabel')}</label>
          <Select
            value={criticModel ?? MODEL_AUTO_VALUE}
            onValueChange={(value) =>
              onCriticModelChange(value === MODEL_AUTO_VALUE ? null : value)
            }
            disabled={criticModelOptionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('compare.critic.modelPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MODEL_AUTO_VALUE}>
                {t('compare.critic.modelPlaceholder')}
              </SelectItem>
              {criticModelOptions.map((option) => (
                <SelectItem
                  key={option.value ?? MODEL_AUTO_VALUE}
                  value={option.value ?? MODEL_AUTO_VALUE}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
