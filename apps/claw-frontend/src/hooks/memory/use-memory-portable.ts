import { useMutation, useQueryClient } from '@tanstack/react-query';

import { memoryPortableRepository } from '@/repositories/memory/memory-portable.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemoryImportResult } from '@/types';

export function useExportMemory() {
  return useMutation<string, Error, void>({
    mutationFn: () => memoryPortableRepository.exportNdjson(),
  });
}

export function useImportMemory() {
  const queryClient = useQueryClient();
  return useMutation<MemoryImportResult, Error, string>({
    mutationFn: (ndjson) => memoryPortableRepository.importNdjson(ndjson),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
  });
}
