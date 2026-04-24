'use client';

import type { ReactElement } from 'react';

import { AiActionDialog } from '@/components/ai/ai-action-dialog';
import { PageHeader } from '@/components/common/page-header';
import { WorkflowActionsBar } from '@/components/workspace/workflow/workflow-actions-bar';
import { WorkflowObjectList } from '@/components/workspace/workflow/workflow-object-list';
import { WorkflowSelectedStrip } from '@/components/workspace/workflow/workflow-selected-strip';
import { useWorkspaceWorkflowPage } from '@/hooks/workspace/use-workspace-workflow-page';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceworkflowsPage(): ReactElement {
  const { t } = useTranslation();
  const {
    objects,
    isLoading,
    isError,
    selectedItems,
    aiDialogKind,
    handleAddItem,
    handleRemoveItem,
    handleClearItems,
    handleOpenAiAction,
    handleCloseAiAction,
    combinedContext,
  } = useWorkspaceWorkflowPage();

  const selectedItemIds = selectedItems.map((item) => item.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('workflow.page.title')} description={t('workflow.page.description')} />

      <WorkflowObjectList
        objects={objects}
        selectedItemIds={selectedItemIds}
        isLoading={isLoading}
        isError={isError}
        onAdd={handleAddItem}
        onRemove={handleRemoveItem}
        t={t}
      />

      {selectedItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          <WorkflowSelectedStrip
            selectedItems={selectedItems}
            onRemove={handleRemoveItem}
            onClear={handleClearItems}
            t={t}
          />
          <WorkflowActionsBar
            hasItems={selectedItems.length > 0}
            onAction={handleOpenAiAction}
            t={t}
          />
        </div>
      ) : null}

      {aiDialogKind !== null && selectedItems.length > 0 ? (
        <AiActionDialog
          open
          onClose={handleCloseAiAction}
          actionKind={aiDialogKind}
          contextPreview={`${selectedItems.length} ${t('workflow.object.selected_count')}`}
          initialContext={combinedContext}
          t={t}
        />
      ) : null}
    </div>
  );
}
