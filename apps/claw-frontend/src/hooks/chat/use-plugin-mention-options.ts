import type { PluginMentionView } from '@claw/shared-types';
import { useQuery } from '@tanstack/react-query';

import { PLUGIN_MENTION_STALE_MS } from '@/constants/plugin-mention.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

/**
 * The signed-in user's installed plugins, names in their language. The request starts only when
 * a composer first sees an `@`, so a page that never mentions anything never asks, and a minute
 * of cache keeps the picker instant afterwards. No polling.
 *
 * A failure (a plan without plugins, a role without `PLUGINS_USE`) yields an empty list: the
 * picker simply never opens, and `@` stays an ordinary character.
 */
export function usePluginMentionOptions(enabled: boolean): readonly PluginMentionView[] {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.plugins.mentions(locale),
    queryFn: () => pluginInstallsRepository.mentions(),
    enabled,
    staleTime: PLUGIN_MENTION_STALE_MS,
    retry: false,
  });
  return query.data ?? [];
}
