import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MODEL_AUTO_VALUE } from '@/constants';
import type { CompareJudgeControlsProps } from '@/types';

export function CompareJudgeControls({
  judgeEnabled,
  onJudgeEnabledChange,
  judgeModel,
  onJudgeModelChange,
  judgeModelOptions,
  judgeModelOptionsLoading,
  t,
}: CompareJudgeControlsProps): React.ReactElement {
  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-sm font-medium" htmlFor="compare-judge-enabled">
            {t('chat.judgeReferee')}
          </label>
          <p className="text-xs text-muted-foreground">{t('chat.judgeRefereeDescription')}</p>
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
          <p className="text-xs text-muted-foreground">{t('chat.judgeModelDescription')}</p>
          <Select
            value={judgeModel ?? MODEL_AUTO_VALUE}
            onValueChange={(value) => onJudgeModelChange(value === MODEL_AUTO_VALUE ? null : value)}
            disabled={judgeModelOptionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('chat.judgeModelAuto')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MODEL_AUTO_VALUE}>{t('chat.judgeModelAuto')}</SelectItem>
              {judgeModelOptions.map((option) => (
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
