import { HTTP_STATUS_NOT_FOUND } from '@/constants/http-status.constants';
import { useTranslation } from '@/lib/i18n';
import { ApiClientError } from '@/services/shared/api-client';
import type { UsePluginDetailReturn } from '@/types/plugins.types';

import { usePluginEntry } from './use-plugin-entry';

/** The detail page's state: the entry, and whether a failure means "no such plugin" or "try again". */
export function usePluginDetail(slug: string): UsePluginDetailReturn {
  const { t } = useTranslation();
  const query = usePluginEntry(slug);
  const isNotFound =
    query.error instanceof ApiClientError && query.error.status === HTTP_STATUS_NOT_FOUND;

  return {
    t,
    plugin: query.data,
    isLoading: query.isLoading,
    isNotFound,
    isError: query.isError && !isNotFound,
    retry: () => {
      void query.refetch();
    },
  };
}
