import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contextPackTemplatesRepository } from '@/repositories/context-packs/context-pack-templates.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CloneTemplateRequest, ContextPack, ContextPackTemplate } from '@/types';

export function useContextPackTemplates(category?: string) {
  const query = useQuery<ContextPackTemplate[]>({
    queryKey: queryKeys.contextPacks.templates(category),
    queryFn: () => contextPackTemplatesRepository.list(category),
  });
  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useCloneContextPackTemplate() {
  const queryClient = useQueryClient();
  return useMutation<ContextPack, Error, { templateId: string; data: CloneTemplateRequest }>({
    mutationFn: ({ templateId, data }) => contextPackTemplatesRepository.clone(templateId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contextPacks.lists() });
    },
  });
}
