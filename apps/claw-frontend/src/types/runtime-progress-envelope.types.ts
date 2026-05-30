// Frontend-local mirror of the shared `ClawRuntimeProgressEvent` shape.
// The frontend does not link `@claw/shared-types`, so we keep a structural
// twin here — only the fields the UI actually reads are typed strictly;
// everything else stays optional / loose to tolerate enum drift between
// the BE envelope contract and a stale FE bundle.

export type RuntimeProgressEnvelopeMetrics = {
  startedAtMs?: number;
  elapsedMs?: number;
  currentStep?: number;
  totalSteps?: number;
  progressPercent?: number;
  samplingMs?: number;
  saveMs?: number;
  progressConfidence?: string;
};

export type ClawRuntimeProgressEnvelope = {
  id: string;
  runId: string;
  version: 'runtime-progress-v1';
  provider: string;
  modality: string;
  eventType: string;
  stage: string;
  sequence: number;
  createdAtMs: number;
  modelId?: string;
  runtimeUrl?: string;
  rawProviderEventType?: string;
  imagePreviewBase64?: string;
  artifactId?: string;
  errorMessage?: string;
  metrics?: RuntimeProgressEnvelopeMetrics;
  // PR4 — ComfyUI populates these for executing/progress/executed events
  // so the FE node-timeline can highlight the active node.
  nodeId?: string;
  nodeName?: string;
};
