import { useState } from 'react';

import { AdminPluginsTab } from '@/enums/admin-plugins-tab.enum';
import { useTranslation } from '@/lib/i18n';
import type { UseAdminPluginsPageReturn } from '@/types/plugin-installs.types';

import { useAdminPluginCatalog } from './use-admin-plugin-catalog';
import { useAdminPluginSettings } from './use-admin-plugin-settings';

/** The admin console: the active tab, and the two tabs' state. The route is gated on PLUGINS_ADMIN. */
export function useAdminPluginsPage(): UseAdminPluginsPageReturn {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminPluginsTab>(AdminPluginsTab.Catalog);
  return { t, tab, setTab, catalog: useAdminPluginCatalog(), settings: useAdminPluginSettings() };
}
