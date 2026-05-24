import { useQuery } from '@tanstack/react-query';

import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemoryAuditLog } from '@/types';

export function useMemoryAuditAll(limit = 100) {
  const query = useQuery<MemoryAuditLog[]>({
    queryKey: queryKeys.memory.auditAll(),
    queryFn: () => memoryRepository.listAudit(limit),
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useMemoryAuditForMemory(memoryId: string | null) {
  const query = useQuery<MemoryAuditLog[]>({
    queryKey: queryKeys.memory.audit(memoryId ?? 'none'),
    queryFn: () => memoryRepository.listAuditForMemory(memoryId ?? ''),
    enabled: memoryId !== null && memoryId !== '',
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
