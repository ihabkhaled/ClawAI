import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_ROLE_PACK_POLL_COUNT,
  ROLE_PACK_POLL_INTERVAL_MS,
  ROLE_PACK_POLL_MESSAGES_LIMIT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RolePackMetadata, RolePackResult, UseRolePackPollResult } from '@/types';

export function useRolePackPoll(threadId: string | null): UseRolePackPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isRolePackError, setIsRolePackError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsRolePackError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_ROLE_PACK_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, ROLE_PACK_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? ROLE_PACK_POLL_INTERVAL_MS : false,
  });

  const rolePackResult = (() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      return null;
    }
    const found = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['rolePack'] === true;
    });
    if (!found) {
      return null;
    }
    const result: RolePackResult = {
      content: found.content,
      metadata: found.metadata as RolePackMetadata,
    };
    return result;
  })();

  const isRolePackReady = rolePackResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsRolePackError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isRolePackReady) {
      setPollingEnabled(false);
    }
  }, [isRolePackReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    rolePackResult,
    isPolling: pollingEnabled,
    isRolePackReady,
    isRolePackError,
    handleViewInThread,
  };
}
