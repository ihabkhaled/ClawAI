'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { LOCAL_FRONTIER_API_BASE } from '@/constants/local-frontier.constants';
import { FrontierPullJobStatus } from '@/enums/local-frontier.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullJobProgressEvent } from '@/types/local-frontier.types';
import { connectSse } from '@/utilities/sse.utility';

export function usePullProgressSse(jobId: string | null): PullJobProgressEvent | null {
  const [event, setEvent] = useState<PullJobProgressEvent | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) {
      setEvent(null);
      return;
    }

    const url = `${LOCAL_FRONTIER_API_BASE}/pull-jobs/${jobId}/progress`;
    const conn = connectSse(
      url,
      {
        onMessage: (raw) => {
          try {
            const parsed = JSON.parse(raw) as PullJobProgressEvent;
            setEvent(parsed);
            if (
              parsed.status === FrontierPullJobStatus.COMPLETED ||
              parsed.status === FrontierPullJobStatus.FAILED ||
              parsed.status === FrontierPullJobStatus.CANCELLED
            ) {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.localFrontier.pullJobs(),
              });
              void queryClient.invalidateQueries({ queryKey: ['local-frontier', 'catalog'] });
            }
          } catch (error) {
            console.error('usePullProgressSse: parse error', error);
          }
        },
        onError: (error) => {
          console.warn('usePullProgressSse: stream error', error);
        },
        onReconnect: (attempt) => {
          console.warn(`usePullProgressSse: reconnect attempt ${attempt}`);
        },
      },
      { reconnect: true },
    );

    return () => {
      conn.close();
    };
  }, [jobId, queryClient]);

  return event;
}
