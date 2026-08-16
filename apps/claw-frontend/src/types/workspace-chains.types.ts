import type { TranslateFunction } from './i18n.types';

export type ChainStep = {
  id: string;
  connectorId: string;
  actionType: string;
  payload: Record<string, unknown>;
};

export type ChainDsl = {
  steps: ChainStep[];
};

export type WorkspaceChain = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  dsl: ChainDsl;
  isEnabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceChainTemplate = {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  requiredProviders: string[];
  dslTemplate: ChainDsl;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ChainStepRunView = {
  stepId: string;
  stepIndex: number;
  connectorId: string;
  actionType: string;
  status: string;
  resolvedPayload: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  errorClass: string | null;
};

export type ChainRunView = {
  id: string;
  chainId: string;
  status: string;
  error: string | null;
  wasResumed: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  steps: ChainStepRunView[];
};

export type WorkspaceChainRun = {
  id: string;
  chainId: string;
  userId: string;
  status: string;
  error: string | null;
  wasResumed: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstantiateChainTemplateRequest = {
  name: string;
  connectorSelections: Record<string, string>;
};

export type UseChainTemplatesReturn = {
  templates: WorkspaceChainTemplate[];
  isLoading: boolean;
  isError: boolean;
};

export type UseChainsReturn = {
  chains: WorkspaceChain[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export type UseChainRunsReturn = {
  runs: WorkspaceChainRun[];
  isLoading: boolean;
  isError: boolean;
};

export type UseInstantiateChainTemplateReturn = {
  mutateAsync: (input: {
    key: string;
    data: InstantiateChainTemplateRequest;
  }) => Promise<WorkspaceChain>;
  isPending: boolean;
  error: Error | null;
};

export type UseRunChainReturn = {
  mutateAsync: (chainId: string) => Promise<ChainRunView>;
  isPending: boolean;
  error: Error | null;
};

export type UseResumeChainRunReturn = {
  mutateAsync: (input: { chainId: string; runId: string }) => Promise<ChainRunView>;
  isPending: boolean;
  error: Error | null;
};

export type WorkspaceAutomationsPageProps = {
  t: TranslateFunction;
};

export type ChainTemplateCardProps = {
  template: WorkspaceChainTemplate;
  onInstantiate: (template: WorkspaceChainTemplate) => void;
  t: TranslateFunction;
};

export type ChainRowProps = {
  chain: WorkspaceChain;
  onRun: (chainId: string) => void;
  onViewRuns: (chainId: string) => void;
  isRunPending: boolean;
  lastRunView: ChainRunView | null;
  t: TranslateFunction;
};

export type InstantiateTemplateDialogProps = {
  open: boolean;
  template: WorkspaceChainTemplate | null;
  connectors: Array<{ id: string; provider: string; name: string; status: string }>;
  onClose: () => void;
  onSubmit: (input: InstantiateChainTemplateRequest) => void;
  isPending: boolean;
  error: string | null;
  t: TranslateFunction;
};

export type WorkspaceAutomationsConnectorOption = {
  id: string;
  provider: string;
  name: string;
  status: string;
};

export type UseWorkspaceAutomationsPageReturn = {
  t: TranslateFunction;
  templates: WorkspaceChainTemplate[];
  isTemplatesLoading: boolean;
  isTemplatesError: boolean;
  chains: WorkspaceChain[];
  isChainsLoading: boolean;
  isChainsError: boolean;
  connectors: WorkspaceAutomationsConnectorOption[];
  instantiateDialogTemplate: WorkspaceChainTemplate | null;
  openInstantiateDialog: (template: WorkspaceChainTemplate) => void;
  closeInstantiateDialog: () => void;
  handleInstantiate: (input: InstantiateChainTemplateRequest) => Promise<void>;
  isInstantiatePending: boolean;
  instantiateError: string | null;
  handleRun: (chainId: string) => Promise<void>;
  isRunPending: boolean;
  lastRunViewByChain: Record<string, ChainRunView>;
  historyDialogChainId: string | null;
  openHistoryDialog: (chainId: string) => void;
  closeHistoryDialog: () => void;
  runsForHistoryDialog: WorkspaceChainRun[];
  isRunsLoading: boolean;
  handleResume: (runId: string) => Promise<void>;
  isResumePending: boolean;
};

export type ChainRunHistoryDialogProps = {
  open: boolean;
  chainId: string | null;
  runs: WorkspaceChainRun[];
  isLoading: boolean;
  onClose: () => void;
  onResume: (runId: string) => void;
  isResumePending: boolean;
  t: TranslateFunction;
};
