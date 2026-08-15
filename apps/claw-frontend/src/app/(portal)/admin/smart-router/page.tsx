'use client';

import { SmartRouterChainTab } from '@/components/admin/smart-router/smart-router-chain-tab';
import { SmartRouterCompareTab } from '@/components/admin/smart-router/smart-router-compare-tab';
import { SmartRouterOverviewTab } from '@/components/admin/smart-router/smart-router-overview-tab';
import { SmartRouterPublishTab } from '@/components/admin/smart-router/smart-router-publish-tab';
import { SmartRouterRevisionDetailTab } from '@/components/admin/smart-router/smart-router-revision-detail-tab';
import { SmartRouterRevisionsTab } from '@/components/admin/smart-router/smart-router-revisions-tab';
import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SMART_ROUTER_TAB_CHAIN,
  SMART_ROUTER_TAB_COMPARE,
  SMART_ROUTER_TAB_OVERVIEW,
  SMART_ROUTER_TAB_PUBLISH,
  SMART_ROUTER_TAB_REVISIONS,
  SMART_ROUTER_TAB_REVISION_DETAIL,
} from '@/constants/smart-router-admin.constants';
import { useSmartRouterAdminPage } from '@/hooks/admin/use-smart-router-admin-page';

export default function AdminSmartRouterPage(): React.ReactElement {
  const controller = useSmartRouterAdminPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={controller.t('smartRouterAdmin.title')}
        description={controller.t('smartRouterAdmin.description')}
      />

      <Tabs value={controller.activeTab} onValueChange={controller.setActiveTab}>
        <TabsList>
          <TabsTrigger value={SMART_ROUTER_TAB_OVERVIEW}>
            {controller.t('smartRouterAdmin.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value={SMART_ROUTER_TAB_CHAIN}>
            {controller.t('smartRouterAdmin.tabs.chain')}
          </TabsTrigger>
          <TabsTrigger value={SMART_ROUTER_TAB_REVISIONS}>
            {controller.t('smartRouterAdmin.tabs.revisions')}
          </TabsTrigger>
          <TabsTrigger value={SMART_ROUTER_TAB_REVISION_DETAIL}>
            {controller.t('smartRouterAdmin.tabs.revisionDetail')}
          </TabsTrigger>
          <TabsTrigger value={SMART_ROUTER_TAB_PUBLISH}>
            {controller.t('smartRouterAdmin.tabs.publish')}
          </TabsTrigger>
          <TabsTrigger value={SMART_ROUTER_TAB_COMPARE}>
            {controller.t('smartRouterAdmin.tabs.compare')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={SMART_ROUTER_TAB_OVERVIEW} className="mt-4">
          <SmartRouterOverviewTab {...controller.overview} t={controller.t} />
        </TabsContent>

        <TabsContent value={SMART_ROUTER_TAB_CHAIN} className="mt-4">
          <SmartRouterChainTab {...controller.chain} t={controller.t} />
        </TabsContent>

        <TabsContent value={SMART_ROUTER_TAB_REVISIONS} className="mt-4">
          <SmartRouterRevisionsTab {...controller.revisions} t={controller.t} />
        </TabsContent>

        <TabsContent value={SMART_ROUTER_TAB_REVISION_DETAIL} className="mt-4">
          <SmartRouterRevisionDetailTab {...controller.revisionDetail} t={controller.t} />
        </TabsContent>

        <TabsContent value={SMART_ROUTER_TAB_PUBLISH} className="mt-4">
          <SmartRouterPublishTab {...controller.publish} t={controller.t} />
        </TabsContent>

        <TabsContent value={SMART_ROUTER_TAB_COMPARE} className="mt-4">
          <SmartRouterCompareTab {...controller.compare} t={controller.t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
