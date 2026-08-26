import { useState } from 'react';

import { useWorkspaceConnectors } from '@/hooks/workspace/use-workspace-connectors';
import { useTranslation } from '@/lib/i18n';
import type {
  ChainDsl,
  ChainRunView,
  InstantiateChainTemplateRequest,
  UseWorkspaceAutomationsPageReturn,
  WorkspaceChainTemplate,
} from '@/types';

import {
  useCreateChain,
  useDraftChainFromNl,
  useInstantiateChainTemplate,
  useResumeChainRun,
  useRunChain,
} from './use-chain-mutations';
import { useChainRuns } from './use-chain-runs';
import { useChainTemplates } from './use-chain-templates';
import { useChains } from './use-chains';

export function useWorkspaceAutomationsPage(): UseWorkspaceAutomationsPageReturn {
  const { t } = useTranslation();
  const templatesQuery = useChainTemplates();
  const chainsQuery = useChains();
  const connectorsQuery = useWorkspaceConnectors();
  const instantiateMutation = useInstantiateChainTemplate();
  const runMutation = useRunChain();
  const resumeMutation = useResumeChainRun();
  const draftMutation = useDraftChainFromNl();
  const createMutation = useCreateChain();

  const [instantiateDialogTemplate, setInstantiateDialogTemplate] =
    useState<WorkspaceChainTemplate | null>(null);
  const [historyDialogChainId, setHistoryDialogChainId] = useState<string | null>(null);
  const [lastRunViewByChain, setLastRunViewByChain] = useState<Record<string, ChainRunView>>({});
  const [isNlDraftDialogOpen, setIsNlDraftDialogOpen] = useState(false);
  const [nlDraft, setNlDraft] = useState<ChainDsl | null>(null);

  const runsQuery = useChainRuns(historyDialogChainId);

  const handleInstantiate = async (input: InstantiateChainTemplateRequest): Promise<void> => {
    if (instantiateDialogTemplate === null) {
      return;
    }
    await instantiateMutation.mutateAsync({ key: instantiateDialogTemplate.key, data: input });
    setInstantiateDialogTemplate(null);
  };

  const handleRun = async (chainId: string): Promise<void> => {
    const result = await runMutation.mutateAsync(chainId);
    setLastRunViewByChain((prev) => ({ ...prev, [chainId]: result }));
  };

  const handleResume = async (runId: string): Promise<void> => {
    if (historyDialogChainId === null) {
      return;
    }
    await resumeMutation.mutateAsync({ chainId: historyDialogChainId, runId });
  };

  const closeNlDraftDialog = (): void => {
    setIsNlDraftDialogOpen(false);
    setNlDraft(null);
  };

  const handleNlDraft = async (prompt: string): Promise<void> => {
    const dsl = await draftMutation.mutateAsync(prompt);
    setNlDraft(dsl);
  };

  const handleSaveNlDraft = async (name: string): Promise<void> => {
    if (nlDraft === null) {
      return;
    }
    await createMutation.mutateAsync({ name, dsl: nlDraft, isEnabled: true });
    closeNlDraftDialog();
  };

  return {
    t,
    templates: templatesQuery.templates,
    isTemplatesLoading: templatesQuery.isLoading,
    isTemplatesError: templatesQuery.isError,
    chains: chainsQuery.chains,
    isChainsLoading: chainsQuery.isLoading,
    isChainsError: chainsQuery.isError,
    connectors: (connectorsQuery.data?.data ?? []).map((c) => ({
      id: c.id,
      provider: c.provider,
      name: c.name,
      status: c.status,
    })),
    instantiateDialogTemplate,
    openInstantiateDialog: setInstantiateDialogTemplate,
    closeInstantiateDialog: () => setInstantiateDialogTemplate(null),
    handleInstantiate,
    isInstantiatePending: instantiateMutation.isPending,
    instantiateError: instantiateMutation.error?.message ?? null,
    handleRun,
    isRunPending: runMutation.isPending,
    lastRunViewByChain,
    historyDialogChainId,
    openHistoryDialog: setHistoryDialogChainId,
    closeHistoryDialog: () => setHistoryDialogChainId(null),
    runsForHistoryDialog: runsQuery.runs,
    isRunsLoading: runsQuery.isLoading,
    handleResume,
    isResumePending: resumeMutation.isPending,
    isNlDraftDialogOpen,
    openNlDraftDialog: () => setIsNlDraftDialogOpen(true),
    closeNlDraftDialog,
    handleNlDraft,
    isNlDraftPending: draftMutation.isPending,
    nlDraftError: draftMutation.error?.message ?? null,
    nlDraft,
    handleSaveNlDraft,
    isNlDraftSavePending: createMutation.isPending,
    nlDraftSaveError: createMutation.error?.message ?? null,
  };
}
