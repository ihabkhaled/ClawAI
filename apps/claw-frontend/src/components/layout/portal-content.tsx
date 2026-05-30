'use client';

import { AccessDenied } from '@/components/admin/access-denied';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ComponentSize } from '@/enums';
import { useRoutePermissionGuard } from '@/hooks/auth/use-route-permission-guard';
import { useTranslation } from '@/lib/i18n';
import type { PortalContentProps } from '@/types';

// Renders the portal page content, gating it behind the route's resolved
// requirement (a Permission, a PlanFeature, both, or neither). When
// entitlements are still loading on first render, show a spinner instead of
// flickering AccessDenied for plan-feature-gated routes. When the signed-in
// user lacks any required permission/feature for the current route we show
// <AccessDenied>. The backend still enforces access — this is the UI layer only.
export function PortalContent({ children }: PortalContentProps): React.ReactElement {
  const { allowed, isLoading } = useRoutePermissionGuard();
  const { t } = useTranslation();

  if (isLoading && !allowed) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={ComponentSize.MD} label={t('common.loading')} />
      </div>
    );
  }

  if (!allowed) {
    return <AccessDenied t={t} />;
  }

  return <>{children}</>;
}
