import { ContextPackSelector } from '@/components/chat/context-pack-selector';
import { ModelSelector } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  onSave,
  isPending,
}: ThreadSettingsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('chat.threadSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('chat.preferredModel')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('chat.preferredModelDescription')}
          </p>
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
          <p className="text-xs text-muted-foreground">
            {t('chat.temperatureDescription')}
          </p>
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
          <p className="text-xs text-muted-foreground">
            {t('chat.maxTokensDescription')}
          </p>
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
          <label className="text-sm font-medium">
            {t('chat.contextPacks')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('chat.contextPacksDescription')}
          </p>
          <ContextPackSelector
            t={t}
            selectedIds={contextPackIds}
            onChange={onContextPackIdsChange}
          />
        </div>

        <Button onClick={onSave} disabled={isPending} size="sm">
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
