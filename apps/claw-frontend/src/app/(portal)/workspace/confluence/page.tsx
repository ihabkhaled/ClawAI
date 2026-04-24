'use client';

import { FileText } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { ConfluencePageDialog } from '@/components/workspace/confluence/confluence-page-dialog';
import { ConfluencePageList } from '@/components/workspace/confluence/confluence-page-list';
import { useConfluencePage } from '@/hooks/workspace/use-confluence-page';
import { useTranslation } from '@/lib/i18n';

export default function ConfluencePage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    pages,
    isLoading,
    isError,
    selectedPage,
    aiDialogKind,
    handleSelectPage,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useConfluencePage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('confluence.page.title')}
        description={t('confluence.page.description')}
      />

      {connector === undefined ? (
        <EmptyState
          icon={FileText}
          title={t('confluence.page.no_connector_title')}
          description={t('confluence.page.no_connector_description')}
        />
      ) : (
        <ConfluencePageList
          pages={pages}
          isLoading={isLoading}
          isError={isError}
          onSelectPage={handleSelectPage}
          t={t}
        />
      )}

      <ConfluencePageDialog
        page={selectedPage}
        open={selectedPage !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedPage !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedPage.title}
          initialContext={selectedPage.content ?? selectedPage.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
