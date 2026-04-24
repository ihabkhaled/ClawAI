'use client';

import { FileText } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { DocFileDialog } from '@/components/workspace/docs/doc-file-dialog';
import { DocFileList } from '@/components/workspace/docs/doc-file-list';
import { useDocsPage } from '@/hooks/workspace/use-docs-page';
import { useTranslation } from '@/lib/i18n';

export default function DocsPage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    docs,
    isLoading,
    isError,
    selectedDoc,
    aiDialogKind,
    handleSelectDoc,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useDocsPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('docs.page.title')} description={t('docs.page.description')} />

      {connector === undefined ? (
        <EmptyState
          icon={FileText}
          title={t('docs.page.no_connector_title')}
          description={t('docs.page.no_connector_description')}
        />
      ) : (
        <DocFileList
          docs={docs}
          isLoading={isLoading}
          isError={isError}
          onSelectDoc={handleSelectDoc}
          t={t}
        />
      )}

      <DocFileDialog
        doc={selectedDoc}
        open={selectedDoc !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedDoc !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedDoc.title}
          initialContext={selectedDoc.content ?? selectedDoc.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
