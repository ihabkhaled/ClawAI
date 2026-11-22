import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useLiveHistory } from '@/hooks/live/use-live-history';
import { useLiveHistoryActions } from '@/hooks/live/use-live-history-actions';
import { useLiveStartForm } from '@/hooks/live/use-live-start-form';
import { useLiveUsage } from '@/hooks/live/use-live-usage';
import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { LiveCreateSessionInput, UseLivePageResult } from '@/types/live.types';

/** Controller for /live: the start form, the modal's input, history, history detail and usage. */
export function useLivePage(): UseLivePageResult {
  const { t, locale } = useTranslation();
  const client = useQueryClient();
  const form = useLiveStartForm();
  const history = useLiveHistory();
  const historyActions = useLiveHistoryActions();
  const usage = useLiveUsage();
  const [sessionInput, setSessionInput] = useState<LiveCreateSessionInput | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { buildSessionInput } = form;

  const start = useCallback((): void => {
    const input = buildSessionInput();
    if (input !== null) {
      setSessionInput(input);
    }
  }, [buildSessionInput]);
  const closeModal = useCallback((): void => {
    setSessionInput(null);
    // What was watched is now in history, and the minutes moved.
    void client.invalidateQueries({ queryKey: queryKeys.live.history() });
    void client.invalidateQueries({ queryKey: queryKeys.live.usage() });
  }, [client]);

  return {
    t,
    locale,
    form,
    history,
    historyActions,
    usage,
    sessionInput,
    detailId,
    start,
    closeModal,
    openDetail: setDetailId,
    closeDetail: () => setDetailId(null),
  };
}
