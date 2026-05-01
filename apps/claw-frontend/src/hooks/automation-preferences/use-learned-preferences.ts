import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import {
  type LearnedPreferenceItem,
  listLearnedPreferences,
} from '@/repositories/workspace/learned-preferences.repository';

export function useLearnedPreferences(actionKind?: string): {
  items: LearnedPreferenceItem[];
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.learnedPreferences.list(actionKind),
    queryFn: () => listLearnedPreferences(actionKind),
    staleTime: 60_000,
  });
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
