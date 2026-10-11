import { useMemo, useState } from 'react';

import { OBSERVABILITY_TABS } from '@/constants/observability-explorer.constants';
import { ObservabilityTab } from '@/enums/observability-tab.enum';
import { Permission } from '@/enums/permission.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useExplorerFilterOptions } from '@/hooks/observability/use-explorer-filter-options';
import { useObservabilityFilters } from '@/hooks/observability/use-observability-filters';

/**
 * State of the Observability page: the active tab, the shared period and
 * filters, the filter choices, and which user's dialog is open. Failures needs
 * ADMIN_SYSTEM_VIEW, so that tab is dropped for an admin without it.
 */
export function useObservabilityExplorer() {
  const { can } = usePermissions();
  const canViewFailures = can(Permission.ADMIN_SYSTEM_VIEW);
  const [tab, setTab] = useState<ObservabilityTab>(ObservabilityTab.Overview);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const filters = useObservabilityFilters();
  const options = useExplorerFilterOptions(filters.scope);

  const tabs = useMemo(
    () =>
      OBSERVABILITY_TABS.filter(
        (definition) => definition.tab !== ObservabilityTab.Failures || canViewFailures,
      ),
    [canViewFailures],
  );

  return { tab, setTab, tabs, filters, options, openUserId, setOpenUserId };
}
