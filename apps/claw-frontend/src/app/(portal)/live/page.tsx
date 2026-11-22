'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { LiveHistoryDetailDialog } from '@/components/live/live-history-detail-dialog';
import { LiveHistoryList } from '@/components/live/live-history-list';
import { LiveModal } from '@/components/live/live-modal';
import { LiveStartForm } from '@/components/live/live-start-form';
import { LiveUsageCard } from '@/components/live/live-usage-card';
import { useLivePage } from '@/hooks/live/use-live-page';

/** Live Intelligence (ADR-221): start a stream, see your minutes, browse your history. */
export default function LivePage(): ReactElement {
  const controller = useLivePage();
  const { t } = controller;
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={t('live.page.title')} description={t('live.page.description')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveStartForm form={controller.form} t={t} onStart={controller.start} />
        </div>
        <LiveUsageCard usage={controller.usage} t={t} locale={controller.locale} />
      </div>
      <LiveHistoryList
        history={controller.history}
        actions={controller.historyActions}
        t={t}
        locale={controller.locale}
        onOpen={controller.openDetail}
      />
      {controller.sessionInput ? (
        <LiveModal input={controller.sessionInput} onClose={controller.closeModal} />
      ) : null}
      {controller.detailId ? (
        <LiveHistoryDetailDialog sessionId={controller.detailId} onClose={controller.closeDetail} />
      ) : null}
    </div>
  );
}
