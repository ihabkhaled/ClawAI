'use client';

import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { DashboardQuickActionCard } from '@/components/dashboard/dashboard-quick-action-card';
import { DashboardStatCard } from '@/components/dashboard/dashboard-stat-card';
import { DashboardSystemHealthCard } from '@/components/dashboard/dashboard-system-health-card';
import { useDashboardPage } from '@/hooks/dashboard/use-dashboard-page';
import { useTranslation } from '@/lib/i18n';

export default function DashboardPage(): React.ReactElement {
  const {
    statCards,
    quickActions,
    isLoading,
    healthStatus,
    healthServices,
    healthSummary,
    greetingKey,
    greetingName,
    operationalState,
  } = useDashboardPage();
  const { t } = useTranslation();

  return (
    <div>
      <DashboardHero
        greetingKey={greetingKey}
        greetingName={greetingName}
        operationalState={operationalState}
      />

      {/* Mobile: 2-column stat grid. Tablet+ keeps the 4-up layout. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <DashboardStatCard key={stat.label} card={stat} isLoading={isLoading} />
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <DashboardQuickActionCard key={action.label} action={action} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          {t('dashboard.systemHealth')}
        </h2>
        <DashboardSystemHealthCard
          healthStatus={healthStatus}
          healthServices={healthServices}
          healthSummary={healthSummary}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}
