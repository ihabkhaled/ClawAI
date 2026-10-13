'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { UserConsumptionDialog } from '@/components/observability/explorer/user-consumption-dialog';
import { LegacyObservability } from '@/components/observability/legacy-observability';
import { OpenGrafanaButton } from '@/components/observability/open-grafana-button';
import { ObservabilityFilterBar } from '@/components/observability/pages/observability-filter-bar';
import { ObservabilityNav } from '@/components/observability/pages/observability-nav';
import { ROUTES } from '@/constants/routes.constants';
import { Permission } from '@/enums/permission.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useObservabilityFilterOptions } from '@/hooks/observability/use-observability-filter-options';
import { ObservabilityScopeContext } from '@/hooks/observability/use-observability-scope';
import { useObservabilityUrl } from '@/hooks/observability/use-observability-url';
import { useTranslation } from '@/lib/i18n';
import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';
import { isProviderDetailPath } from '@/utilities/observability-url.utility';

/**
 * Frame of every Observability page: title, sub-navigation, the one shared
 * period and filter bar (all in the URL), and the user-consumption dialog that
 * `?user=` opens. An actor without ADMIN_USAGE_VIEW keeps the page they had on
 * the hub and is sent back to it from any sub-page; the server enforces the
 * permission, so this only picks a view.
 */
export function ObservabilityShell({ children }: { children: ReactNode }): ReactElement {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const canViewUsage = can(Permission.ADMIN_USAGE_VIEW);
  const url = useObservabilityUrl();
  const options = useObservabilityFilterOptions(url.scope, canViewUsage);
  const onHub = pathname === ROUTES.OBSERVABILITY;

  useEffect(() => {
    if (!canViewUsage && !onHub) {
      router.replace(ROUTES.OBSERVABILITY);
    }
  }, [canViewUsage, onHub, router]);

  const value = useMemo<ObservabilityPagesContextValue>(
    () => ({
      state: url.state,
      scope: url.scope,
      options,
      issue: url.issue,
      sharedQuery: url.sharedQuery,
      setParams: url.setParams,
      setPeriod: url.setPeriod,
      setFilter: url.setFilter,
      clearFilters: url.clearFilters,
      openUser: url.openUser,
      closeUser: url.closeUser,
      param: url.param,
    }),
    [
      url.state,
      url.scope,
      url.issue,
      url.sharedQuery,
      url.setParams,
      url.setPeriod,
      url.setFilter,
      url.clearFilters,
      url.openUser,
      url.closeUser,
      url.param,
      options,
    ],
  );

  const header = (
    <PageHeader
      title={t('observability.title')}
      description={t('observability.fullDescription')}
      actions={<OpenGrafanaButton />}
    />
  );

  if (!canViewUsage) {
    return onHub ? (
      <div>
        {header}
        <LegacyObservability />
      </div>
    ) : (
      <div>{header}</div>
    );
  }

  return (
    <ObservabilityScopeContext.Provider value={value}>
      <div className="min-w-0">
        {header}
        <div className="min-w-0 space-y-6">
          <ObservabilityNav
            canViewSystem={can(Permission.ADMIN_SYSTEM_VIEW)}
            sharedQuery={url.sharedQuery}
            t={t}
          />
          <ObservabilityFilterBar
            scope={value}
            hideProviderModel={isProviderDetailPath(pathname)}
            t={t}
          />
          {children}
        </div>
        <UserConsumptionDialog
          userId={url.state.user === '' ? null : url.state.user}
          initialScope={url.scope}
          onClose={url.closeUser}
          t={t}
        />
      </div>
    </ObservabilityScopeContext.Provider>
  );
}
