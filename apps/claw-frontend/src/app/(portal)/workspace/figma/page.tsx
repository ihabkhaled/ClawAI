'use client';

import { Frame as Figma } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { FigmaDesignDialog } from '@/components/workspace/figma/figma-design-dialog';
import { FigmaDesignList } from '@/components/workspace/figma/figma-design-list';
import { useFigmaPage } from '@/hooks/workspace/use-figma-page';
import { useTranslation } from '@/lib/i18n';

export default function FigmaPage(): ReactElement {
  const { t } = useTranslation();
  const {
    connector,
    designs,
    isLoading,
    isError,
    selectedDesign,
    aiDialogKind,
    handleSelectDesign,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
  } = useFigmaPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('figma.page.title')} description={t('figma.page.description')} />

      {connector === undefined ? (
        <EmptyState
          icon={Figma}
          title={t('figma.page.no_connector_title')}
          description={t('figma.page.no_connector_description')}
        />
      ) : (
        <FigmaDesignList
          designs={designs}
          isLoading={isLoading}
          isError={isError}
          onSelect={handleSelectDesign}
          t={t}
        />
      )}

      <FigmaDesignDialog
        design={selectedDesign}
        open={selectedDesign !== null}
        onClose={handleCloseDialog}
        onOpenAiAction={handleOpenAiAction}
        t={t}
      />

      {aiDialogKind !== null && selectedDesign !== null ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={selectedDesign.title}
          initialContext={selectedDesign.content ?? selectedDesign.title}
          t={t}
        />
      ) : null}
    </div>
  );
}
