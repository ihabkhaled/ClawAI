import { useInfiniteQuery } from '@tanstack/react-query';

import { PROMPT_LIBRARY_PAGE_SIZE } from '@/constants/chat.constants';
import { promptTemplatesRepository } from '@/repositories/prompt-templates/prompt-templates.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PromptTemplateFilters } from '@/types';

/**
 * Cursor-paged list of the caller's prompt templates.
 *
 * Fetches only while `enabled` (the dialog is open) so the composer costs no
 * request until someone asks for the library. The key lives under
 * `queryKeys.promptTemplates.all`, which every mutation invalidates by prefix.
 */
export function usePromptTemplates(filters: PromptTemplateFilters, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.promptTemplates.list(filters),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      promptTemplatesRepository.list({
        q: filters.q.trim().length > 0 ? filters.q.trim() : undefined,
        tag: filters.tag ?? undefined,
        favorite: filters.favoriteOnly ? true : undefined,
        cursor: pageParam,
        limit: PROMPT_LIBRARY_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
