'use client';

import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMessageEdit } from '@/hooks/chat/use-message-edit';
import { useTranslation } from '@/lib/i18n';
import type { MessageEditActionProps } from '@/types';

/**
 * Edits a prompt and runs the thread again from it.
 *
 * A dialog rather than an inline field, because the consequence does not fit on
 * a button: the server deletes every message below this one, since those were
 * answers to a question that will no longer exist. The warning belongs where
 * the person is about to commit, not in a toast afterwards.
 */
export function MessageEditAction({
  messageId,
  content,
}: MessageEditActionProps): React.ReactElement {
  const { t } = useTranslation();
  const edit = useMessageEdit(messageId, content);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={edit.open}
        aria-label={t('chat.edit.action')}
        title={t('chat.edit.action')}
        className="text-muted-foreground h-7 w-7"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={edit.isOpen} onOpenChange={edit.close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.edit.title')}</DialogTitle>
            <DialogDescription>{t('chat.edit.warning')}</DialogDescription>
          </DialogHeader>

          <Textarea
            value={edit.draft}
            onChange={(event) => edit.setDraft(event.target.value)}
            aria-label={t('chat.edit.title')}
            rows={8}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={edit.close}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={edit.save} disabled={!edit.canSave || edit.isPending}>
              {edit.isPending ? t('chat.edit.saving') : t('chat.edit.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
