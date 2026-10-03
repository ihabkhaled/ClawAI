import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import type { SaveToContextTarget } from '@/enums/save-to-context-target.enum';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ContextSaveRecord } from '@/types';
import type {
  SaveMessageToContextRequest,
  UseMessageSaveActionReturn,
} from '@/types/composer-context.types';
import { showToast } from '@/utilities';

/**
 * The one-click "Save as context pack / Save to memory" on an answer.
 *
 * It does not depend on a model understanding a request: it hands the message
 * the user is looking at to chat-service, which saves that text through the
 * owner-scoped, idempotent memory-service routes. A second click on the same
 * message saves nothing twice. The toast links to what was saved.
 */
export function useMessageSaveAction(messageId: string): UseMessageSaveActionReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useMutation<ContextSaveRecord, Error, SaveMessageToContextRequest>({
    mutationFn: (request) => chatRepository.saveMessageToContext(messageId, request),
    onSuccess: (record) => {
      const link = record.pack?.link ?? record.memory?.link;
      showToast.success({
        title: t('chat.saveMessage.menuLabel'),
        description:
          record.pack === undefined
            ? t('chat.saveMessage.savedMemory')
            : t('chat.saveMessage.savedPack', { name: record.pack.name }),
        action:
          link === undefined
            ? undefined
            : { label: t('chat.saveMessage.open'), onClick: () => router.push(link) },
      });
    },
    onError: (error) => {
      showToast.apiError(error, t('chat.contextSave.failedTitle'), {
        title: t('chat.contextSave.failedTitle'),
        translate: t,
      });
    },
  });

  return {
    save: (target: SaveToContextTarget, packId?: string): void =>
      mutation.mutate({ target, ...(packId === undefined ? {} : { packId }) }),
    isPending: mutation.isPending,
  };
}
