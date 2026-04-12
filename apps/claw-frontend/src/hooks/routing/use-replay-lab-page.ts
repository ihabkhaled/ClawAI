import { useCallback, useState } from 'react';

import { REPLAY_DEFAULT_LIMIT } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { UseReplayLabPageReturn } from '@/types';

import { useReplayRouting } from './use-replay-routing';

export function useReplayLabPage(): UseReplayLabPageReturn {
  const { t } = useTranslation();
  const [routingMode, setRoutingMode] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState<number>(REPLAY_DEFAULT_LIMIT);

  const { replayRouting, data, isPending, isError, error } = useReplayRouting();

  const handleRunReplay = useCallback(() => {
    replayRouting({ routingMode, limit });
  }, [replayRouting, routingMode, limit]);

  return {
    t,
    routingMode,
    setRoutingMode,
    limit,
    setLimit,
    handleRunReplay,
    result: data,
    isPending,
    isError,
    error,
  };
}
