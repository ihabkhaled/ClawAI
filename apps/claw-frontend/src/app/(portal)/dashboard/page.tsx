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
      <div data-tour="dashboard-stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <DashboardStatCard key={stat.label} card={stat} isLoading={isLoading} />
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          {t('dashboard.quickActions')}
        </h2>
        {/* Columns answer to the width of this block, not the window: beside the 256px sidebar a
            768px tablet leaves ~512px, and three viewport-gated columns squeezed every title to 10px. */}
        <div className="@container">
          <div
            data-tour="dashboard-quick-actions"
            className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3"
          >
            {quickActions.map((action) => (
              <DashboardQuickActionCard key={action.label} action={action} />
            ))}
          </div>
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
