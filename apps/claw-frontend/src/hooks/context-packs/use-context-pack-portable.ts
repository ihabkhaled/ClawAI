import { useMutation, useQueryClient } from '@tanstack/react-query';

import { contextPackPortableRepository } from '@/repositories/context-packs/context-pack-portable.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ContextPackExportPayload, ContextPackImportResult } from '@/types';

export function useExportContextPack() {
  return useMutation<ContextPackExportPayload, Error, string>({
    mutationFn: (packId) => contextPackPortableRepository.exportPack(packId),
  });
}

export function useImportContextPack() {
  const queryClient = useQueryClient();
  return useMutation<ContextPackImportResult, Error, ContextPackExportPayload>({
    mutationFn: (payload) => contextPackPortableRepository.importPack(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contextPacks.lists() });
    },
  });
}
