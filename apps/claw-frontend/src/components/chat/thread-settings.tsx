import { ContextPackSelector } from '@/components/chat/context-pack-selector';
import { ModelSelector } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MODEL_AUTO_VALUE } from '@/constants';
import type { ThreadSettingsProps } from '@/types';

export function ThreadSettings({
  t,
  systemPrompt,
  onSystemPromptChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  selectedModel,
  onModelChange,
  contextPackIds,
  onContextPackIdsChange,
  judgeEnabled,
  onJudgeEnabledChange,
  judgeModel,
  onJudgeModelChange,
  judgeModelOptions,
  qualityThreshold,
  onQualityThresholdChange,
  maxReRouteAttempts,
  onMaxReRouteAttemptsChange,
  useMemory,
  onUseMemoryChange,
  useContext,
  onUseContextChange,
  onSave,
  isPending,
  allowJudgeMode,
}: ThreadSettingsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('chat.threadSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('chat.preferredModel')}</label>
          <p className="text-xs text-muted-foreground">{t('chat.preferredModelDescription')}</p>
          <ModelSelector value={selectedModel} onChange={onModelChange} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="system-prompt">
            {t('chat.systemPrompt')}
          </label>
          <Textarea
            id="system-prompt"
            placeholder={t('chat.systemPromptPlaceholder')}
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            maxLength={10000}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="temperature">
            {t('chat.temperature')}: {temperature.toFixed(1)}
          </label>
          <p className="text-xs text-muted-foreground">{t('chat.temperatureDescription')}</p>
          <input
            id="temperature"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>1</span>
            <span>2</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="max-tokens">
            {t('chat.maxTokens')}
          </label>
          <p className="text-xs text-muted-foreground">{t('chat.maxTokensDescription')}</p>
          <Input
            id="max-tokens"
            type="number"
            min={1}
            max={32000}
            placeholder="32000"
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('chat.contextPacks')}</label>
          <p className="text-xs text-muted-foreground">{t('chat.contextPacksDescription')}</p>
          <ContextPackSelector
            t={t}
            selectedIds={contextPackIds}
            onChange={onContextPackIdsChange}
          />
        </div>

        {allowJudgeMode ? (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium" htmlFor="judge-enabled">
                {t('chat.judgeReferee')}
              </label>
              <p className="text-xs text-muted-foreground">{t('chat.judgeRefereeDescription')}</p>
            </div>
            <Switch
              id="judge-enabled"
              checked={judgeEnabled}
              onCheckedChange={onJudgeEnabledChange}
            />
          </div>
        ) : null}

        {allowJudgeMode && judgeEnabled ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('chat.judgeModelLabel')}</label>
            <p className="text-xs text-muted-foreground">{t('chat.judgeModelDescription')}</p>
            <Select
              value={judgeModel ?? MODEL_AUTO_VALUE}
              onValueChange={(v) => onJudgeModelChange(v === MODEL_AUTO_VALUE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('chat.judgeModelAuto')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MODEL_AUTO_VALUE}>{t('chat.judgeModelAuto')}</SelectItem>
                {judgeModelOptions.map((opt) => (
                  <SelectItem
                    key={opt.value ?? MODEL_AUTO_VALUE}
                    value={opt.value ?? MODEL_AUTO_VALUE}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="quality-threshold">
            {t('chat.qualityThreshold')}: {qualityThreshold.toFixed(1)}
          </label>
          <p className="text-xs text-muted-foreground">{t('chat.qualityThresholdDescription')}</p>
          <input
            id="quality-threshold"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={qualityThreshold}
            onChange={(e) => onQualityThresholdChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>0.5</span>
            <span>1</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="max-reroute-attempts">
            {t('chat.maxReRouteAttempts')}: {maxReRouteAttempts}
          </label>
          <p className="text-xs text-muted-foreground">{t('chat.maxReRouteAttemptsDescription')}</p>
          <Input
            id="max-reroute-attempts"
            type="number"
            min={0}
            max={5}
            value={String(maxReRouteAttempts)}
            onChange={(e) => onMaxReRouteAttemptsChange(Number(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-sm font-medium">{t('chat.useMemoryLabel')}</label>
            <p className="text-xs text-muted-foreground">{t('chat.useMemoryDescription')}</p>
          </div>
          <Switch
            checked={useMemory}
            onCheckedChange={onUseMemoryChange}
            aria-label={t('chat.useMemoryLabel')}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-sm font-medium">{t('chat.useContextLabel')}</label>
            <p className="text-xs text-muted-foreground">{t('chat.useContextDescription')}</p>
          </div>
          <Switch
            checked={useContext}
            onCheckedChange={onUseContextChange}
            aria-label={t('chat.useContextLabel')}
          />
        </div>

        <Button onClick={onSave} disabled={isPending} size="sm">
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
