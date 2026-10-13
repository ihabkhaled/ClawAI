import type { ReactElement } from 'react';

import { ThreadErrorNotice } from '@/components/threads/thread-error-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationDeleteDialogProps } from '@/types/thread-generation-progress.types';

/** Confirm before the owner removes a Thread and everything recorded for its job. */
export function ThreadGenerationDeleteDialog({
  remove,
}: ThreadGenerationDeleteDialogProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Dialog open={remove.isOpen} onOpenChange={remove.setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('chat.threadProgress.deleteTitle')}</DialogTitle>
          <DialogDescription>{t('chat.threadProgress.deleteBody')}</DialogDescription>
        </DialogHeader>
        {remove.error === null ? null : <ThreadErrorNotice message={remove.error} />}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={remove.confirm}
            disabled={remove.isDeleting}
            isLoading={remove.isDeleting}
          >
            {t('chat.threadProgress.deleteConfirm')}
          </Button>
          <Button type="button" variant="outline" onClick={() => remove.setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
