import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { MODEL_SIZES_STALE_MS } from '@/constants/model-scale.constants';
import { getModelSizes } from '@/repositories/routing/model-sizes.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseModelSizesResult } from '@/types/model-scale.types';
import { buildModelSizeLookup } from '@/utilities/model-scale.utility';

// The context window and parameter count of every model, for the lists that show a
// size beside a name (ADR-234). A failed lookup shows no size, never an error: the
// picker still works, and a row falls back to the window its own list carries.
export function useModelSizes(): UseModelSizesResult {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.routing.modelSizes(),
    queryFn: getModelSizes,
    staleTime: MODEL_SIZES_STALE_MS,
    retry: false,
  });
  const lookup = useMemo(() => buildModelSizeLookup(data?.data ?? []), [data]);
  return { lookup, isLoading };
}
