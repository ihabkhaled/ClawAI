'use client';

import { Sparkles, Workflow } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ChainRow } from '@/components/workspace-chains/chain-row';
import { ChainRunHistoryDialog } from '@/components/workspace-chains/chain-run-history-dialog';
import { ChainTemplateCard } from '@/components/workspace-chains/chain-template-card';
import { InstantiateTemplateDialog } from '@/components/workspace-chains/instantiate-template-dialog';
import { NlDraftDialog } from '@/components/workspace-chains/nl-draft-dialog';
import { useWorkspaceAutomationsPage } from '@/hooks/workspace-chains/use-workspace-automations-page';

export default function WorkspaceAutomationsPage(): React.ReactElement {
  const {
    t,
    templates,
    isTemplatesLoading,
    isTemplatesError,
    chains,
    isChainsLoading,
    isChainsError,
    connectors,
    instantiateDialogTemplate,
    openInstantiateDialog,
    closeInstantiateDialog,
    handleInstantiate,
    isInstantiatePending,
    instantiateError,
    handleRun,
    isRunPending,
    lastRunViewByChain,
    historyDialogChainId,
    openHistoryDialog,
    closeHistoryDialog,
    runsForHistoryDialog,
    isRunsLoading,
    handleResume,
    isResumePending,
    isNlDraftDialogOpen,
    openNlDraftDialog,
    closeNlDraftDialog,
    handleNlDraft,
    isNlDraftPending,
    nlDraftError,
    nlDraft,
    handleSaveNlDraft,
    isNlDraftSavePending,
    nlDraftSaveError,
  } = useWorkspaceAutomationsPage();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={t('workspaceChains.page.title')}
          description={t('workspaceChains.page.description')}
        />
        <Button variant="outline" onClick={openNlDraftDialog}>
          {t('workspaceChains.nlDraft.openButton')}
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('workspaceChains.templates.heading')}</h2>

        {isTemplatesLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

        {isTemplatesError ? (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
            {t('workspaceChains.templates.loadFailed')}
          </div>
        ) : null}

        {!isTemplatesLoading && !isTemplatesError && templates.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('workspaceChains.templates.emptyTitle')}
            description={t('workspaceChains.templates.emptyDescription')}
          />
        ) : null}

        {!isTemplatesLoading && templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <ChainTemplateCard
                key={template.id}
                template={template}
                onInstantiate={openInstantiateDialog}
                t={t}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('workspaceChains.myAutomations.heading')}</h2>

        {isChainsLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

        {isChainsError ? (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
            {t('workspaceChains.myAutomations.loadFailed')}
          </div>
        ) : null}

        {!isChainsLoading && !isChainsError && chains.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title={t('workspaceChains.myAutomations.emptyTitle')}
            description={t('workspaceChains.myAutomations.emptyDescription')}
          />
        ) : null}

        {!isChainsLoading && chains.length > 0 ? (
          <div className="flex flex-col gap-3">
            {chains.map((chain) => (
              <ChainRow
                key={chain.id}
                chain={chain}
                onRun={handleRun}
                onViewRuns={openHistoryDialog}
                isRunPending={isRunPending}
                lastRunView={lastRunViewByChain[chain.id] ?? null}
                t={t}
              />
            ))}
          </div>
        ) : null}
      </section>

      <InstantiateTemplateDialog
        open={instantiateDialogTemplate !== null}
        template={instantiateDialogTemplate}
        connectors={connectors}
        onClose={closeInstantiateDialog}
        onSubmit={handleInstantiate}
        isPending={isInstantiatePending}
        error={instantiateError}
        t={t}
      />

      <ChainRunHistoryDialog
        open={historyDialogChainId !== null}
        chainId={historyDialogChainId}
        runs={runsForHistoryDialog}
        isLoading={isRunsLoading}
        onClose={closeHistoryDialog}
        onResume={handleResume}
        isResumePending={isResumePending}
        t={t}
      />

      <NlDraftDialog
        open={isNlDraftDialogOpen}
        onClose={closeNlDraftDialog}
        onDraft={handleNlDraft}
        isDraftPending={isNlDraftPending}
        draftError={nlDraftError}
        draft={nlDraft}
        onSave={handleSaveNlDraft}
        isSavePending={isNlDraftSavePending}
        saveError={nlDraftSaveError}
        t={t}
      />
    </div>
  );
}
