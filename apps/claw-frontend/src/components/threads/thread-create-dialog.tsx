import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

import { ThreadGenerationForm } from '@/components/threads/thread-generation-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROUTES } from '@/constants/routes.constants';
import { useThreadGenerationForm } from '@/hooks/threads/use-thread-generation-form';
import { useTranslation } from '@/lib/i18n';
import type {
  ThreadCreateDialogBodyProps,
  ThreadCreateDialogProps,
} from '@/types/thread-publication.types';

function ThreadCreateDialogBody({
  threadId,
  threadTitle,
  onClose,
}: ThreadCreateDialogBodyProps): ReactElement {
  const router = useRouter();
  const form = useThreadGenerationForm({
    fixedSourceThreadId: threadId,
    defaultTopic: threadTitle,
    onStarted: (publicationId) => {
      onClose();
      router.push(`${ROUTES.THREAD_PUBLICATIONS}?publication=${encodeURIComponent(publicationId)}`);
    },
  });
  return <ThreadGenerationForm form={form} />;
}

/**
 * "Turn this chat into a public Thread", opened from the chat header. The form
 * mounts only while open so closed chats never load models or other chats.
 */
export function ThreadCreateDialog({
  open,
  onOpenChange,
  threadId,
  threadTitle,
}: ThreadCreateDialogProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('chat.threadCreateTitle')}</DialogTitle>
          <DialogDescription>{t('chat.threadCreateDialogDescription')}</DialogDescription>
        </DialogHeader>
        {open ? (
          <ThreadCreateDialogBody
            threadId={threadId}
            threadTitle={threadTitle}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
