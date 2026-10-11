import type { ReactElement } from 'react';

import { ConsumptionTab } from '@/components/observability/explorer/consumption-tab';
import { ExplorerFiltersForm } from '@/components/observability/explorer/explorer-filters';
import { FailuresTab } from '@/components/observability/explorer/failures-tab';
import { ModelsTab } from '@/components/observability/explorer/models-tab';
import { OverviewTab } from '@/components/observability/explorer/overview-tab';
import { TracingTab } from '@/components/observability/explorer/tracing-tab';
import { UserConsumptionDialog } from '@/components/observability/explorer/user-consumption-dialog';
import { UsersTab } from '@/components/observability/explorer/users-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ObservabilityTab } from '@/enums/observability-tab.enum';
import { useObservabilityExplorer } from '@/hooks/observability/use-observability-explorer';
import { useTranslation } from '@/lib/i18n';

/**
 * Admin Observability: one shared period and filter set above six sections
 * (overview, consumption, AI and models, users, tracing, failures). Opening a
 * user from any section shows that user's full consumption in a dialog.
 */
export function ObservabilityExplorer(): ReactElement {
  const { t } = useTranslation();
  const explorer = useObservabilityExplorer();
  const { scope } = explorer.filters;

  return (
    <div className="min-w-0 space-y-6">
      <ExplorerFiltersForm state={explorer.filters} options={explorer.options} t={t} />

      <Tabs
        value={explorer.tab}
        onValueChange={(value) => {
          explorer.setTab(value as ObservabilityTab);
        }}
      >
        <TabsList aria-label={t('observabilityExplorer.tabsLabel')}>
          {explorer.tabs.map((definition) => (
            <TabsTrigger key={definition.tab} value={definition.tab}>
              {t(definition.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={ObservabilityTab.Overview}>
          <OverviewTab scope={scope} onOpenUser={explorer.setOpenUserId} t={t} />
        </TabsContent>
        <TabsContent value={ObservabilityTab.Consumption}>
          <ConsumptionTab scope={scope} t={t} />
        </TabsContent>
        <TabsContent value={ObservabilityTab.Models}>
          <ModelsTab scope={scope} t={t} />
        </TabsContent>
        <TabsContent value={ObservabilityTab.Users}>
          <UsersTab scope={scope} onOpenUser={explorer.setOpenUserId} t={t} />
        </TabsContent>
        <TabsContent value={ObservabilityTab.Tracing}>
          <TracingTab scope={scope} t={t} />
        </TabsContent>
        <TabsContent value={ObservabilityTab.Failures}>
          <FailuresTab scope={scope} t={t} />
        </TabsContent>
      </Tabs>

      <UserConsumptionDialog
        userId={explorer.openUserId}
        initialScope={scope}
        onClose={() => {
          explorer.setOpenUserId(null);
        }}
        t={t}
      />
    </div>
  );
}
