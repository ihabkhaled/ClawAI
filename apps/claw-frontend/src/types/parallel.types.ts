export type ParallelModelResponse = {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  status: string;
  errorMessage: string | null;
};

export type ParallelResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
  responses: ParallelModelResponse[];
  totalLatencyMs: number;
  completedCount: number;
  failedCount: number;
};

export type ParallelRequest = {
  threadId: string;
  content: string;
  models: Array<{ provider: string; model: string }>;
};

export type UseParallelComparePageReturn = {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedModels: Array<{ provider: string; model: string }>;
  prompt: string;
  setPrompt: (value: string) => void;
  handleToggleModel: (provider: string, model: string, checked: boolean) => void;
  handleSend: () => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  selectionError: string | null;
};
