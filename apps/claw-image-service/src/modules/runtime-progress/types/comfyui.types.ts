import type {
  ClawRuntimeProgressEvent,
  RuntimeProgressConfidence,
  StreamingErrorType,
} from '@claw/shared-types';

export type ComfyUIWorkflowBuildParams = {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  checkpointName?: string;
  filenamePrefix?: string;
};

export type ComfyUIWorkflowPayload = {
  prompt: Record<string, ComfyUIWorkflowNode>;
  client_id: string;
};

export type ComfyUIWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};

export type ComfyUINodeDescriptor = {
  nodeId: string;
  classType: string;
  humanLabel: string;
  nodeIndex: number;
};

export type ComfyUIGenerationResult = {
  promptId: string;
  imageBase64: string;
  mimeType: string;
  filename: string;
  subfolder: string;
  nodeTimings: ComfyUINodeTiming[];
};

export type ComfyUINodeTiming = {
  nodeId: string;
  classType: string;
  humanLabel: string;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  cached: boolean;
};

export type ComfyUIStreamGenerateOptions = {
  runId: string;
  baseUrl: string;
  workflow: ComfyUIWorkflowPayload;
  onEvent: (event: ClawRuntimeProgressEvent) => void;
  signal?: AbortSignal;
};

export type ComfyUIHistoryImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

export type ComfyUIHistoryEntry = {
  outputs?: Record<string, { images?: ComfyUIHistoryImage[] }>;
  status?: { status_str?: string; completed?: boolean };
};

export type ComfyUIPromptResponse = {
  prompt_id?: string;
  number?: number;
  node_errors?: Record<string, unknown>;
};

export type ComfyUIWebSocketLike = {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: (
    type: string,
    listener: (event: { data?: unknown; error?: unknown }) => void,
    options?: { once?: boolean },
  ) => void;
  removeEventListener?: (
    type: string,
    listener: (event: { data?: unknown; error?: unknown }) => void,
  ) => void;
};

export type ComfyUIWebSocketFactory = (url: string) => ComfyUIWebSocketLike;

export type ComfyUIHttpGetFn = <T>(
  url: string,
  options?: { timeout?: number; responseType?: string },
) => Promise<T>;

export type ComfyUIHttpPostFn = <T>(
  url: string,
  body?: unknown,
  options?: { timeout?: number; headers?: Record<string, string> },
) => Promise<T>;

export type ComfyUIProgressAdapterDeps = {
  webSocketFactory?: ComfyUIWebSocketFactory;
  httpGet?: ComfyUIHttpGetFn;
  httpPost?: ComfyUIHttpPostFn;
};

export type ComfyUIStreamState = {
  promptId: string | undefined;
  done: boolean;
  errorMessage: string | undefined;
  nodesExecuted: Set<string>;
  cachedNodes: Set<string>;
  nodeStartTimes: Map<string, number>;
  nodeEndTimes: Map<string, number>;
  nodeClassTypes: Map<string, string>;
  startedAtMs: number;
};

export type ComfyUIEmitCtx = {
  runId: string;
  baseUrl: string;
  nextSeq: () => number;
  startedAtMs: number;
  onEvent: (event: ClawRuntimeProgressEvent) => void;
};

export type ComfyUIEmitCtxWithState = ComfyUIEmitCtx & {
  state: ComfyUIStreamState;
};

export type ComfyUIEmitExecutingCtx = ComfyUIEmitCtxWithState & {
  descriptors: ReadonlyArray<ComfyUINodeDescriptor>;
  totalNodes: number;
};

export type ComfyUIEmitProgressCtx = ComfyUIEmitCtxWithState & {
  descriptors: ReadonlyArray<ComfyUINodeDescriptor>;
};

export type ComfyUIAttachWsHandlersArgs = ComfyUIEmitExecutingCtx & {
  ws: ComfyUIWebSocketLike;
};

export type ComfyUIHandleWsMessageArgs = ComfyUIEmitExecutingCtx & {
  rawData: unknown;
};

export type ComfyUIErrorEventArgs = {
  runId: string;
  sequence: number;
  baseUrl: string;
  type: StreamingErrorType;
  message: string;
  startedAtMs: number;
};

export type ComfyUIBaseMetrics = {
  startedAtMs: number;
  elapsedMs: number;
  progressConfidence: RuntimeProgressConfidence;
};

export type ComfyUIProbeResult = {
  reachable: boolean;
  latencyMs: number;
  errorMessage?: string;
};
