import { ModelPicker } from '@/components/chat/model-picker';
import { Switch } from '@/components/ui/switch';
import { MODEL_AUTO_VALUE } from '@/constants';
import type { CompareCriticControlsProps } from '@/types';
import { judgeModelOptionsToPickerGroups } from '@/utilities';

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
  const groups = judgeModelOptionsToPickerGroups(criticModelOptions);
  return (
    <div className="border-border/60 bg-muted/10 space-y-4 rounded-lg border p-4 sm:ms-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 space-y-0.5">
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
          <ModelPicker
            groups={groups}
            value={criticModel ?? MODEL_AUTO_VALUE}
            onChange={(value) => onCriticModelChange(value === MODEL_AUTO_VALUE ? null : value)}
            disabled={criticModelOptionsLoading}
            autoOption={{ value: MODEL_AUTO_VALUE, label: t('compare.critic.modelPlaceholder') }}
            placeholder={t('compare.critic.modelPlaceholder')}
            loadingPlaceholder={t('compare.critic.modelPlaceholder')}
            emptyPlaceholder={t('compare.critic.modelPlaceholder')}
            searchPlaceholder={t('common.search')}
            noResultsLabel={t('common.noResults')}
          />
        </div>
      ) : null}
    </div>
  );
}
