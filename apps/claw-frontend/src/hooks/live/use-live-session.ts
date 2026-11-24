import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useLiveSessionClose } from '@/hooks/live/use-live-session-close';
import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import type { LiveCreateSessionInput, UseLiveSessionResult } from '@/types/live.types';
import { showToast } from '@/utilities';

/**
 * One viewer session per modal: created when the modal opens (always at the live edge), closed
 * when it unmounts or the tab goes away. Reopening is a new session (architecture section 3).
 */
export function useLiveSession(input: LiveCreateSessionInput): UseLiveSessionResult {
  const { t } = useTranslation();
  const startedFor = useRef<LiveCreateSessionInput | null>(null);
  const { mutate, data, isPending, error } = useMutation({
    mutationFn: async (value: LiveCreateSessionInput) => {
      const session = await liveRepository.createSession(value);
      // The viewer already confirmed the paid minutes in the summary estimate.
      if (value.approvePaid === true) {
        await liveRepository.approveCredits(session.sessionId, {});
      }
      return session;
    },
    onError: (failure: Error) => showToast.apiError(failure, t('live.modal.sessionError')),
  });

  useEffect(() => {
    // Strict-mode effects run twice; a second POST would open a second session.
    if (startedFor.current === input) {
      return;
    }
    startedFor.current = input;
    mutate(input);
  }, [input, mutate]);
  useLiveSessionClose(data ?? null);

  return {
    session: data ?? null,
    isCreating: isPending,
    error: error === null ? null : t('live.modal.sessionError'),
  };
}
