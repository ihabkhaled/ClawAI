'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AiActionPrivacyClass } from '@/enums/ai-action-kind.enum';
import { useAvailableModelsForAction } from '@/hooks/ai-actions/use-available-models-for-action';
import { useResolveAiAction } from '@/hooks/ai-actions/use-resolve-ai-action';
import type { AiActionDialogProps } from '@/types/ai-action.types';

export function AiActionDialog({
  open,
  onClose,
  actionKind,
  privacyClass = AiActionPrivacyClass.INTERNAL,
  contextPreview,
  t,
}: AiActionDialogProps): ReactElement {
  const { groupedModels, isLoading: isLoadingModels } = useAvailableModelsForAction(actionKind);
  const { resolution, resolve, isPending, error } = useResolveAiAction();
  const [selectedKey, setSelectedKey] = useState<string>('AUTO::auto');

  const handleResolve = (): void => {
    if (selectedKey === 'AUTO::auto') {
      resolve({ actionKind, privacyClass });
      return;
    }
    const [provider, model] = selectedKey.split('::');
    const group = groupedModels.find((g) => g.provider === provider);
    const entry = group?.models.find((m) => m.model === model);
    if (entry === undefined) {
      return;
    }
    resolve({
      actionKind,
      privacyClass,
      preferredModel: {
        provider: entry.provider,
        model: entry.model,
        displayName: entry.displayName,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {t('aiActions.dialog.title', { action: actionKind })}
          </DialogTitle>
          <DialogDescription>{t('aiActions.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            {contextPreview}
          </div>

          <div>
            <label htmlFor="ai-action-model" className="mb-1 block text-sm font-medium">
              {t('aiActions.dialog.model_label')}
            </label>
            <select
              id="ai-action-model"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              disabled={isLoadingModels || isPending}
            >
              {groupedModels.map((group) => (
                <optgroup key={group.provider} label={group.label}>
                  {group.models.map((entry) => (
                    <option
                      key={`${entry.provider}::${entry.model}`}
                      value={`${entry.provider}::${entry.model}`}
                    >
                      {entry.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {resolution !== null ? (
            <div className="rounded-md border border-border bg-card p-3 text-xs">
              <div className="font-medium">
                {t('aiActions.dialog.resolution_mode', { mode: resolution.mode })}
              </div>
              <div className="text-muted-foreground">
                {t('aiActions.dialog.resolution_primary', {
                  model: resolution.primary.displayName,
                })}
              </div>
              {resolution.fallbackChain.length > 0 ? (
                <div className="text-muted-foreground">
                  {t('aiActions.dialog.resolution_fallback', {
                    count: String(resolution.fallbackChain.length),
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {error !== null ? <div className="text-sm text-red-500">{error.message}</div> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t('aiActions.dialog.cancel')}
          </Button>
          <Button type="button" onClick={handleResolve} disabled={isPending}>
            {isPending ? t('aiActions.dialog.resolving') : t('aiActions.dialog.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
