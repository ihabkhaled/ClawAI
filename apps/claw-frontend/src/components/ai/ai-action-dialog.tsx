'use client';

import { Copy, Sparkles } from 'lucide-react';
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
import { useAiActionDialog } from '@/hooks/ai-actions/use-ai-action-dialog';
import type { AiActionDialogProps } from '@/types/ai-action.types';
import { resolveGenerateLabel } from '@/utilities/ai-action-dialog-label.utility';

export function AiActionDialog({
  open,
  onClose,
  actionKind,
  privacyClass = AiActionPrivacyClass.INTERNAL,
  contextPreview,
  initialContext,
  onGenerated,
  t,
}: AiActionDialogProps): ReactElement {
  const ctrl = useAiActionDialog({
    actionKind,
    privacyClass,
    initialContext,
    onGenerated,
    onClose,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? ctrl.handleClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {t('aiActions.dialog.title', { action: actionKind })}
          </DialogTitle>
          <DialogDescription>{t('aiActions.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
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
              value={ctrl.selectedKey}
              onChange={(event) => ctrl.setSelectedKey(event.target.value)}
              disabled={ctrl.isLoadingModels || ctrl.isPending}
            >
              {ctrl.groupedModels.map((group) => (
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

          {ctrl.result !== null ? (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t('aiActions.dialog.generated_by', {
                    model: ctrl.result.generatedBy.displayName,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={ctrl.handleCopy}
                  className="h-7 gap-1 text-xs"
                >
                  <Copy className="size-3" aria-hidden="true" />
                  {ctrl.copied ? t('aiActions.dialog.copied') : t('aiActions.dialog.copy')}
                </Button>
              </div>
              <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                {ctrl.result.content}
              </div>
            </div>
          ) : null}

          {ctrl.error !== null ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {ctrl.error.message}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={ctrl.handleClose}
            disabled={ctrl.isPending}
          >
            {t('aiActions.dialog.close')}
          </Button>
          <Button type="button" onClick={ctrl.handleGenerate} disabled={ctrl.isPending}>
            {resolveGenerateLabel(ctrl.isPending, ctrl.result !== null, t)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
