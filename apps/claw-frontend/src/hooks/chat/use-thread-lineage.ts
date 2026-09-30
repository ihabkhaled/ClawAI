'use client';

import { useQuery } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseThreadLineageReturn } from '@/types';

/**
 * Where this thread sits in its branch family.
 *
 * Disabled until there is a thread id. A failure leaves `lineage` null, which
 * the strip reads as "nothing to show" — lineage is navigation help, and a
 * conversation must never be blocked because its family could not be listed.
 */
export function useThreadLineage(threadId: string): UseThreadLineageReturn {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.threads.lineage(threadId),
    queryFn: () => chatRepository.getThreadLineage(threadId),
    enabled: threadId.length > 0,
  });
  return { lineage: data ?? null, isLoading };
}
