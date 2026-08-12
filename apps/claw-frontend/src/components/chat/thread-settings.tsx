import { ContextPackSelector } from '@/components/chat/context-pack-selector';
import { ModelSelector } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { THREAD_MAX_TOKENS_MAX, THREAD_MAX_TOKENS_MIN } from '@/constants';
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
  useMemory,
  onUseMemoryChange,
  useContext,
  onUseContextChange,
  onSave,
  isPending,
  maxTokensError,
  canSave,
}: ThreadSettingsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('chat.threadSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('chat.preferredModel')}</label>
          <p className="text-muted-foreground text-xs">{t('chat.preferredModelDescription')}</p>
          {/* Symmetric with MessageComposer: pass `disabled={isPending}` so both */}
          {/* selectors share IDENTICAL runtime gating. Model SELECTION is never */}
          {/* gated by plan features — compare/judge/critic/research gate workflows, */}
          {/* not which model you can pick. See model-selector.tsx for full rules. */}
          <ModelSelector value={selectedModel} onChange={onModelChange} disabled={isPending} />
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
          <p className="text-muted-foreground text-xs">{t('chat.temperatureDescription')}</p>
          <input
            id="temperature"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="accent-primary w-full"
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>0</span>
            <span>1</span>
            <span>2</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="max-tokens">
            {t('chat.maxTokens')}
          </label>
          <p className="text-muted-foreground text-xs">{t('chat.maxTokensDescription')}</p>
          <Input
            id="max-tokens"
            type="number"
            min={THREAD_MAX_TOKENS_MIN}
            max={THREAD_MAX_TOKENS_MAX}
            placeholder={String(THREAD_MAX_TOKENS_MAX)}
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(e.target.value)}
            aria-invalid={maxTokensError !== null}
            aria-describedby={maxTokensError !== null ? 'max-tokens-error' : undefined}
          />
          {maxTokensError !== null ? (
            <p id="max-tokens-error" role="alert" className="text-destructive text-xs">
              {maxTokensError}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('chat.contextPacks')}</label>
          <p className="text-muted-foreground text-xs">{t('chat.contextPacksDescription')}</p>
          <ContextPackSelector
            t={t}
            selectedIds={contextPackIds}
            onChange={onContextPackIdsChange}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-sm font-medium">{t('chat.useMemoryLabel')}</label>
            <p className="text-muted-foreground text-xs">{t('chat.useMemoryDescription')}</p>
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
            <p className="text-muted-foreground text-xs">{t('chat.useContextDescription')}</p>
          </div>
          <Switch
            checked={useContext}
            onCheckedChange={onUseContextChange}
            aria-label={t('chat.useContextLabel')}
          />
        </div>

        <Button onClick={onSave} disabled={isPending || !canSave} size="sm">
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
