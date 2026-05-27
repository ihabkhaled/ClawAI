'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  HF_DEFAULT_QUANTIZATION,
  HF_SEARCH_DEBOUNCE_MS,
  HF_SEARCH_RESULT_LIMIT,
} from '@/constants/hf-search.constants';
import { HfCategoryChoice, HfQualityTierChoice, HfSearchSort } from '@/enums/hf-search.enum';
import { useDebounce } from '@/hooks/common/use-debounce';
import { useHfDetails } from '@/hooks/local-frontier/use-hf-details';
import { useHfImport } from '@/hooks/local-frontier/use-hf-import';
import { useHfSearch } from '@/hooks/local-frontier/use-hf-search';
import type { HfSearchDialogController } from '@/types/hf-search.types';

export function useHfSearchDialog(open: boolean): HfSearchDialogController {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<HfSearchSort>(HfSearchSort.TRENDING);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [quantization, setQuantization] = useState(HF_DEFAULT_QUANTIZATION);
  const [category, setCategory] = useState<HfCategoryChoice>(HfCategoryChoice.GENERAL);
  const [qualityTier, setQualityTier] = useState<HfQualityTierChoice>(
    HfQualityTierChoice.BALANCED,
  );

  const debouncedQuery = useDebounce(query, HF_SEARCH_DEBOUNCE_MS);
  const searchQuery = useHfSearch(
    { q: debouncedQuery, sort, limit: HF_SEARCH_RESULT_LIMIT },
    open,
  );
  const detailsQuery = useHfDetails(open ? selectedRepo : null);
  const importMutation = useHfImport();
  const loadMore = useCallback((): void => {
    searchQuery.fetchNextPage();
  }, [searchQuery]);

  // When detail loads with a recommended quant, default the picker to it.
  useEffect(() => {
    if (
      detailsQuery.data?.recommendedFile?.quantization &&
      quantization === HF_DEFAULT_QUANTIZATION
    ) {
      setQuantization(detailsQuery.data.recommendedFile.quantization);
    }
  }, [detailsQuery.data, quantization]);

  const selectRepo = useCallback((repo: string | null) => {
    setSelectedRepo(repo);
    if (repo !== null) {
      setQuantization(HF_DEFAULT_QUANTIZATION);
    }
  }, []);

  const submitImport = useCallback(async (): Promise<void> => {
    if (!selectedRepo) {
      return;
    }
    await importMutation.mutateAsync({
      repo: selectedRepo,
      quantization,
      category,
      qualityTier,
    });
    setSelectedRepo(null);
  }, [selectedRepo, quantization, category, qualityTier, importMutation]);

  const resetSelection = useCallback((): void => {
    setSelectedRepo(null);
    setQuantization(HF_DEFAULT_QUANTIZATION);
    setCategory(HfCategoryChoice.GENERAL);
    setQualityTier(HfQualityTierChoice.BALANCED);
  }, []);

  return {
    query,
    setQuery,
    sort,
    setSort,
    results: searchQuery.data,
    isLoadingResults: searchQuery.isLoading,
    resultsError: searchQuery.error ?? null,
    hasMoreResults: searchQuery.hasNextPage,
    isLoadingMoreResults: searchQuery.isFetchingNextPage,
    loadMoreResults: loadMore,
    selectedRepo,
    selectRepo,
    details: detailsQuery.data,
    isLoadingDetails: detailsQuery.isLoading,
    quantization,
    setQuantization,
    category,
    setCategory,
    qualityTier,
    setQualityTier,
    isImporting: importMutation.isPending,
    importError: importMutation.error ?? null,
    submitImport,
    resetSelection,
  };
}
