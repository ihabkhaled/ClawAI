import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { searchWorkspace } from '@/repositories/workspace/inbox.repository';
import type {
  SearchHit,
  SearchResponse,
  UseWorkspaceSearchResult,
} from '@/types/workspace-inbox.types';

export function useWorkspaceSearch(): UseWorkspaceSearchResult {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [embeddingModel, setEmbeddingModel] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (q: string) => searchWorkspace({ query: q }),
    onSuccess: (data: SearchResponse) => {
      setHits(data.hits);
      setEmbeddingModel(data.embeddingModel);
    },
  });

  const submit = useCallback((): void => {
    if (query.trim().length < 2) {
      return;
    }
    void mutation.mutateAsync(query.trim());
  }, [mutation, query]);

  const reset = useCallback((): void => {
    setQuery('');
    setHits([]);
  }, []);

  return {
    query,
    setQuery,
    hits,
    isSearching: mutation.isPending,
    isError: mutation.isError,
    error: (mutation.error as Error | null) ?? null,
    embeddingModel,
    submit,
    reset,
  };
}
