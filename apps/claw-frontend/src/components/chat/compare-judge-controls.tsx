import { ModelPicker } from '@/components/chat/model-picker';
import { Switch } from '@/components/ui/switch';
import { MODEL_AUTO_VALUE } from '@/constants';
import type { CompareJudgeControlsProps } from '@/types';
import { judgeModelOptionsToPickerGroups } from '@/utilities';

export function CompareJudgeControls({
  judgeEnabled,
  onJudgeEnabledChange,
  judgeModel,
  onJudgeModelChange,
  judgeModelOptions,
  judgeModelOptionsLoading,
  t,
}: CompareJudgeControlsProps): React.ReactElement {
  const groups = judgeModelOptionsToPickerGroups(judgeModelOptions);
  return (
    <div className="border-border/60 bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-sm font-medium" htmlFor="compare-judge-enabled">
            {t('chat.judgeReferee')}
          </label>
          <p className="text-muted-foreground text-xs">{t('chat.judgeRefereeDescription')}</p>
        </div>
        <Switch
          id="compare-judge-enabled"
          checked={judgeEnabled}
          onCheckedChange={onJudgeEnabledChange}
        />
      </div>

      {judgeEnabled ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('chat.judgeModelLabel')}</label>
          <p className="text-muted-foreground text-xs">{t('chat.judgeModelDescription')}</p>
          <ModelPicker
            groups={groups}
            value={judgeModel ?? MODEL_AUTO_VALUE}
            onChange={(value) => onJudgeModelChange(value === MODEL_AUTO_VALUE ? null : value)}
            disabled={judgeModelOptionsLoading}
            autoOption={{ value: MODEL_AUTO_VALUE, label: t('chat.judgeModelAuto') }}
            placeholder={t('chat.judgeModelAuto')}
            loadingPlaceholder={t('chat.judgeModelAuto')}
            emptyPlaceholder={t('chat.judgeModelAuto')}
            searchPlaceholder={t('common.search')}
            noResultsLabel={t('common.noResults')}
          />
        </div>
      ) : null}
    </div>
  );
}
