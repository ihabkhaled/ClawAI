'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EmailTemplateDialogProps } from '@/types/email-template-components.types';

export function EmailTemplateDialog({
  draft,
  isSaving,
  saveError,
  onUpdateField,
  onClose,
  onSave,
  labels,
}: EmailTemplateDialogProps): ReactElement {
  const open = draft !== null;
  const isCreate = draft?.id === null;
  const canSave =
    draft !== null &&
    draft.name.trim().length > 0 &&
    draft.subject.trim().length > 0 &&
    draft.body.trim().length > 0 &&
    !isSaving;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCreate ? labels.createTitle : labels.editTitle}</DialogTitle>
        </DialogHeader>

        {draft !== null ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" htmlFor="tpl-name">
                {labels.nameLabel}
              </label>
              <Input
                id="tpl-name"
                value={draft.name}
                placeholder={labels.namePlaceholder}
                maxLength={120}
                onChange={(e) => onUpdateField('name', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" htmlFor="tpl-subject">
                {labels.subjectLabel}
              </label>
              <Input
                id="tpl-subject"
                value={draft.subject}
                placeholder={labels.subjectPlaceholder}
                maxLength={500}
                onChange={(e) => onUpdateField('subject', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" htmlFor="tpl-body">
                {labels.bodyLabel}
              </label>
              <Textarea
                id="tpl-body"
                value={draft.body}
                placeholder={labels.bodyPlaceholder}
                maxLength={16_000}
                rows={8}
                onChange={(e) => onUpdateField('body', e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={draft.isDefault}
                onCheckedChange={(next) => onUpdateField('isDefault', next === true)}
              />
              {labels.defaultLabel}
            </label>

            {saveError !== null ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {saveError.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {labels.cancel}
          </Button>
          <Button onClick={onSave} disabled={!canSave}>
            {isSaving ? labels.saving : labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
