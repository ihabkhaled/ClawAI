'use client';

import { useCallback } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { useTranslation } from '@/lib/i18n';
import type { UseJumpToMessageReturn } from '@/types';

/**
 * Says so when a search result cannot be scrolled to.
 *
 * Search runs over the whole thread; the message list holds one page of it. So
 * a genuine match can sit outside the loaded window, and the scroll call has
 * nothing to scroll to. Returning silently there is defensible for the list —
 * jumping somewhere arbitrary would be worse — but from the outside it is a
 * click that does nothing, which reads as a broken button rather than as a
 * boundary.
 */
export function useJumpToMessage(jump: (messageId: string) => boolean): UseJumpToMessageReturn {
  const { t } = useTranslation();
  const { toast } = useToast();

  const jumpToMessage = useCallback(
    (messageId: string): void => {
      if (jump(messageId)) {
        return;
      }
      toast({
        title: t('chat.search.notLoadedTitle'),
        description: t('chat.search.notLoaded'),
        variant: ToastVariant.Default,
      });
    },
    [jump, t, toast],
  );

  return { jumpToMessage };
}
