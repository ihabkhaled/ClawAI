import { useQuery } from '@tanstack/react-query';

import { HTTP_STATUS_NOT_FOUND } from '@/constants/http-status.constants';
import { PLUGIN_DETAIL_MAX_RETRIES } from '@/constants/plugins.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginsRepository } from '@/repositories/plugins/plugins.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { ApiClientError } from '@/services/shared/api-client';

/** One catalog entry. A 404 is not retried: a missing slug will not appear on a second try. */
export function usePluginEntry(slug: string) {
  const { locale } = useTranslation();
  return useQuery({
    queryKey: queryKeys.plugins.detail(slug, locale),
    queryFn: () => pluginsRepository.getCatalogEntry(slug, locale),
    retry: (failureCount, error) =>
      !(error instanceof ApiClientError && error.status === HTTP_STATUS_NOT_FOUND) &&
      failureCount < PLUGIN_DETAIL_MAX_RETRIES,
  });
}
