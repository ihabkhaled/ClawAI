'use client';

import { AccessDenied } from '@/components/admin/access-denied';
import { useRoutePermissionGuard } from '@/hooks/auth/use-route-permission-guard';
import { useTranslation } from '@/lib/i18n';
import type { PortalContentProps } from '@/types';

// Renders the portal page content, gating it behind the route's required
// permission. When the signed-in user lacks the permission for the current
// route we show <AccessDenied> instead of the page. The backend still enforces
// access — this is the UI layer only.
export function PortalContent({ children }: PortalContentProps): React.ReactElement {
  const { allowed } = useRoutePermissionGuard();
  const { t } = useTranslation();

  if (!allowed) {
    return <AccessDenied t={t} />;
  }

  return <>{children}</>;
}
