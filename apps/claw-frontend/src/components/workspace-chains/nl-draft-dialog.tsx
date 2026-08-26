'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { NlDraftDialogProps } from '@/types';

export function NlDraftDialog({
  open,
  onClose,
  onDraft,
  isDraftPending,
  draftError,
  draft,
  onSave,
  isSavePending,
  saveError,
  t,
}: NlDraftDialogProps): React.ReactElement {
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setPrompt('');
      setName('');
      onClose();
    }
  };

  const handleDraft = (): void => {
    onDraft(prompt.trim());
  };

  const handleSave = (): void => {
    onSave(name.trim());
  };

  let draftPreview: React.ReactElement | null = null;
  if (draft !== null && draft.steps.length === 0) {
    draftPreview = (
      <p className="text-muted-foreground text-sm">{t('workspaceChains.nlDraft.noMatch')}</p>
    );
  } else if (draft !== null) {
    draftPreview = (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t('workspaceChains.nlDraft.previewHeading')}</p>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          {draft.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {step.actionType}
              </Badge>
              <span className="text-muted-foreground">{step.connectorId}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nl-draft-name" className="text-sm font-medium">
            {t('workspaceChains.nlDraft.nameLabel')}
            <span className="text-destructive ml-1">*</span>
          </label>
          <Input
            id="nl-draft-name"
            value={name}
            placeholder={t('workspaceChains.nlDraft.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {saveError !== null ? <p className="text-destructive text-xs">{saveError}</p> : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('workspaceChains.nlDraft.title')}</DialogTitle>
          <DialogDescription>{t('workspaceChains.nlDraft.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="nl-draft-prompt" className="text-sm font-medium">
              {t('workspaceChains.nlDraft.promptLabel')}
            </label>
            <Textarea
              id="nl-draft-prompt"
              value={prompt}
              placeholder={t('workspaceChains.nlDraft.promptPlaceholder')}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {draftError !== null ? <p className="text-destructive text-xs">{draftError}</p> : null}

          {draftPreview}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDraftPending}
          >
            {t('common.cancel')}
          </Button>
          {draft !== null && draft.steps.length > 0 ? (
            <Button onClick={handleSave} disabled={isSavePending || name.trim().length === 0}>
              {isSavePending
                ? t('workspaceChains.nlDraft.saving')
                : t('workspaceChains.nlDraft.save')}
            </Button>
          ) : (
            <Button onClick={handleDraft} disabled={isDraftPending || prompt.trim().length === 0}>
              {isDraftPending
                ? t('workspaceChains.nlDraft.drafting')
                : t('workspaceChains.nlDraft.draft')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
