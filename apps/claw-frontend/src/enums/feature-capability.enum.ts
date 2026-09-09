/**
 * The capability pages under `/features`. Each documents ClawAI's own
 * implementation of a capability area — the plan-gated feature, routing mode
 * or connector set behind it — as opposed to `/learn/*`, which explains the
 * general concept, or `/use-cases/*`, which answers "how do I do this job".
 * Six of the nine sections on the pre-existing `/features` hub (routing,
 * orchestration, memory, files, generation, workspace, observability,
 * security — providers is covered by the separate `/model-providers`
 * cluster) become full pages here; routing+orchestration and files+generation
 * are each merged into one page because they share one underlying mechanism.
 */
export enum FeatureCapability {
  MODEL_ROUTING_AND_ORCHESTRATION = 'model-routing-and-orchestration',
  MEMORY_AND_CONTEXT = 'memory-and-context',
  WORKSPACE_CONNECTORS = 'workspace-connectors',
  FILE_AND_DOCUMENT_HANDLING = 'file-and-document-handling',
  OBSERVABILITY_AND_TRANSPARENCY = 'observability-and-transparency',
  SECURITY_AND_DATA_HANDLING = 'security-and-data-handling',
}
