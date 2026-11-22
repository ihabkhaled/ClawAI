'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { fetchModelVisibility } from '@/services/admin/model-visibility.service';
import type { UseModelVisibilityResult } from '@/types/model-visibility.types';

/**
 * The "Why hidden?" diagnostic for one model. Mounted only while its dialog is
 * open, so a page of rows asks nothing until an admin clicks. Always fresh: the
 * point is the state right now, after an expose or a sync.
 */
export function useModelVisibility(
  provider: string,
  modelKey: string,
  onClose: () => void,
): UseModelVisibilityResult {
  const { locale } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.connectors.modelVisibility(provider, modelKey),
    queryFn: () => fetchModelVisibility(provider, modelKey),
    staleTime: 0,
    retry: false,
  });
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose],
  );
  return { report: data ?? null, isLoading, isError, locale, onOpenChange };
}
