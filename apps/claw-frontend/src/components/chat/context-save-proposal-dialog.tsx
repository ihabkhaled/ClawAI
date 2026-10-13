'use client';

import { Brain, Layers, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CONTEXT_SAVE_ERROR_KEYS,
  CONTEXT_SAVE_MEMORY_TYPE_LABELS,
  CONTEXT_SAVE_MEMORY_TYPES,
  CONTEXT_SAVE_NEW_PACK_CHOICE,
} from '@/constants/context-save.constants';
import { useContextSaveProposalDialog } from '@/hooks/chat/use-context-save-proposal-dialog';
import { useTranslation } from '@/lib/i18n';
import type { ContextSaveMemoryType, ContextSaveProposalDialogProps } from '@/types';

/**
 * The "Remember this" dialog (ADR-168): the model decided a message is a save
 * request, and this is where the user checks and edits what would be written -
 * memory, a context pack, or both - before anything is. Nothing is stored until
 * Save. Closing with X or Escape keeps the proposal on its card; "Not now"
 * discards it.
 */
export function ContextSaveProposalDialog(
  props: ContextSaveProposalDialogProps,
): React.ReactElement {
  const { t } = useTranslation();
  const { proposal } = props;
  const dialog = useContextSaveProposalDialog(props);
  const { form, actions } = dialog;
  const { draft, errors } = form;
  const busy = actions.isConfirming || actions.isDismissing;
  const showPackName = draft.includePack && draft.packChoice === CONTEXT_SAVE_NEW_PACK_CHOICE;

  return (
    <Dialog open onOpenChange={dialog.onOpenChange}>
      <DialogContent
        className="max-w-xl"
        onCloseAutoFocus={dialog.onCloseAutoFocus}
        data-testid="context-save-proposal-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('chat.contextSave.proposal.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('chat.contextSave.proposal.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <section className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
            <div className="flex min-h-11 items-center gap-2">
              <Checkbox
                id="context-save-include-memory"
                checked={draft.includeMemory}
                onCheckedChange={(checked) => form.setIncludeMemory(checked === true)}
                disabled={busy}
              />
              <label
                htmlFor="context-save-include-memory"
                className="flex min-w-0 items-center gap-2 text-sm font-medium"
              >
                <Brain className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
                {t('chat.contextSave.proposal.memorySection')}
              </label>
            </div>
            {draft.includeMemory ? (
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-col gap-1 text-sm">
                  <label htmlFor="context-save-memory-type">
                    {t('chat.contextSave.proposal.memoryType')}
                  </label>
                  <Select
                    value={draft.memoryType}
                    onValueChange={(value) => form.setMemoryType(value as ContextSaveMemoryType)}
                    disabled={busy}
                  >
                    <SelectTrigger id="context-save-memory-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXT_SAVE_MEMORY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(CONTEXT_SAVE_MEMORY_TYPE_LABELS[type])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  {t('chat.contextSave.proposal.memoryText')}
                  <Textarea
                    value={draft.memoryText}
                    onChange={(event) => form.setMemoryText(event.target.value)}
                    disabled={busy}
                    rows={3}
                    aria-invalid={errors.memoryText !== null}
                    aria-describedby={
                      errors.memoryText === null ? undefined : 'context-save-memory-error'
                    }
                  />
                </label>
                {errors.memoryText ? (
                  <p
                    id="context-save-memory-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {t(CONTEXT_SAVE_ERROR_KEYS[errors.memoryText])}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
            <div className="flex min-h-11 items-center gap-2">
              <Checkbox
                id="context-save-include-pack"
                checked={draft.includePack}
                onCheckedChange={(checked) => form.setIncludePack(checked === true)}
                disabled={busy}
              />
              <label
                htmlFor="context-save-include-pack"
                className="flex min-w-0 items-center gap-2 text-sm font-medium"
              >
                <Layers className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
                {t('chat.contextSave.proposal.packSection')}
              </label>
            </div>
            {draft.includePack ? (
              <div className="flex min-w-0 flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  {t('chat.contextSave.proposal.packContent')}
                  <Textarea
                    value={draft.packContent}
                    onChange={(event) => form.setPackContent(event.target.value)}
                    disabled={busy}
                    rows={6}
                    aria-invalid={errors.packContent !== null}
                    aria-describedby={
                      errors.packContent === null ? undefined : 'context-save-pack-content-error'
                    }
                  />
                </label>
                {errors.packContent ? (
                  <p
                    id="context-save-pack-content-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {t(CONTEXT_SAVE_ERROR_KEYS[errors.packContent])}
                  </p>
                ) : null}
                <div className="flex flex-col gap-1 text-sm">
                  <label htmlFor="context-save-pack-choice">
                    {t('chat.contextSave.proposal.packChoose')}
                  </label>
                  <Select
                    value={draft.packChoice}
                    onValueChange={form.setPackChoice}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id="context-save-pack-choice"
                      aria-invalid={errors.packChoice !== null}
                      aria-describedby={
                        errors.packChoice === null ? undefined : 'context-save-pack-choice-error'
                      }
                    >
                      <SelectValue placeholder={t('chat.contextSave.proposal.packPick')} />
                    </SelectTrigger>
                    <SelectContent>
                      {proposal.options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {t('chat.contextSave.proposal.packOption', {
                            name: option.name,
                            count: String(option.itemCount),
                          })}
                        </SelectItem>
                      ))}
                      <SelectItem value={CONTEXT_SAVE_NEW_PACK_CHOICE}>
                        {t('chat.contextSave.proposal.packNew')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.packChoice ? (
                  <p
                    id="context-save-pack-choice-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {t(CONTEXT_SAVE_ERROR_KEYS[errors.packChoice])}
                  </p>
                ) : null}
                {showPackName ? (
                  <label className="flex flex-col gap-1 text-sm">
                    {t('chat.contextSave.proposal.packNewName')}
                    <Input
                      value={draft.newPackName}
                      onChange={(event) => form.setNewPackName(event.target.value)}
                      disabled={busy}
                      error={errors.newPackName !== null}
                      aria-describedby={
                        errors.newPackName === null ? undefined : 'context-save-new-pack-name-error'
                      }
                    />
                  </label>
                ) : null}
                {errors.newPackName ? (
                  <p
                    id="context-save-new-pack-name-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {t(CONTEXT_SAVE_ERROR_KEYS[errors.newPackName])}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {errors.nothingSelected ? (
            <p className="text-destructive text-xs" role="alert">
              {t('chat.contextSave.proposal.errors.nothingSelected')}
            </p>
          ) : null}

          <div className="flex min-h-11 items-start gap-2">
            <Checkbox
              id="context-save-always-auto"
              checked={dialog.alwaysAuto}
              onCheckedChange={(checked) => dialog.onAlwaysAutoChange(checked === true)}
              disabled={busy}
            />
            <label htmlFor="context-save-always-auto" className="flex flex-col gap-0.5 text-sm">
              {t('chat.contextSave.proposal.alwaysAuto')}
              <span className="text-muted-foreground text-xs">
                {t('chat.contextSave.proposal.alwaysAutoHint')}
              </span>
            </label>
          </div>
        </div>

        {actions.errorMessage ? (
          <p className="text-destructive text-sm" role="alert">
            {actions.errorMessage}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={busy} onClick={actions.dismiss}>
            {t('chat.contextSave.proposal.notNow')}
          </Button>
          <Button type="button" disabled={!form.canSave || busy} onClick={dialog.onSave}>
            {actions.isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {actions.isConfirming
              ? t('chat.contextSave.saving')
              : t('chat.contextSave.proposal.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
