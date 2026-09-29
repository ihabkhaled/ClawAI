'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { MEMORY_DEEP_LINK_PARAM } from '@/constants/deep-link.constants';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemoryRecord } from '@/types';

/**
 * `/memory?memoryId=…` (the chat's saved card, ADR-134) opens that memory in
 * the editor — where its type can be changed — once, on arrival. The memory is
 * read by id, so it opens whatever filter the page is on.
 */
export function useMemoryDeepLink(onOpen: (memory: MemoryRecord) => void): void {
  const memoryId = useSearchParams().get(MEMORY_DEEP_LINK_PARAM);
  const opened = useRef(false);
  const { data } = useQuery({
    queryKey: queryKeys.memory.detail(memoryId ?? ''),
    queryFn: () => memoryRepository.getMemory(memoryId ?? ''),
    enabled: memoryId !== null && memoryId.length > 0,
  });
  useEffect(() => {
    if (data !== undefined && !opened.current) {
      opened.current = true;
      onOpen(data);
    }
  }, [data, onOpen]);
}
