import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveCreditsResult } from '@/types/live.types';
import { showToast } from '@/utilities';
import { usdInputToMicroUsd } from '@/utilities/micro-usd-input.utility';

/** Explicit approval of paid minutes, with an optional spending cap typed in dollars. */
export function useLiveCredits(sessionId: string): UseLiveCreditsResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [capUsd, setCapUsd] = useState('');
  const cap = usdInputToMicroUsd(capUsd);
  const capInvalid = cap === undefined;
  const { mutate, isPending } = useMutation({
    mutationFn: (spendingCapMicroUsd: number | null) =>
      liveRepository.approveCredits(
        sessionId,
        spendingCapMicroUsd === null ? {} : { spendingCapMicroUsd },
      ),
    // The answer is the session state, not usage: the month counters are refetched, and the
    // banner follows the next heartbeat / SSE status.
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.live.usage() });
      showToast.success({ description: t('live.credits.approved') });
    },
    onError: (error: Error) => showToast.apiError(error, t('live.credits.error')),
  });
  const approve = useCallback((): void => {
    if (cap !== undefined) {
      mutate(cap);
    }
  }, [cap, mutate]);

  return { capUsd, capInvalid, isApproving: isPending, setCapUsd, approve };
}
