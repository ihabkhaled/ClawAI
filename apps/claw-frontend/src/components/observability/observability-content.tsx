import type { ReactElement } from 'react';

import { ObservabilityExplorer } from '@/components/observability/explorer/observability-explorer';
import { LegacyObservability } from '@/components/observability/legacy-observability';
import { Permission } from '@/enums/permission.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';

/**
 * The explorer for an administrator who can view usage; everyone else keeps the
 * page they had. The server enforces the permission, so this only picks a view.
 */
export function ObservabilityContent(): ReactElement {
  const { can } = usePermissions();
  return can(Permission.ADMIN_USAGE_VIEW) ? <ObservabilityExplorer /> : <LegacyObservability />;
}
