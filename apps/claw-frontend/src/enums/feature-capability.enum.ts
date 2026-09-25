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
  // The 2026-09 flagship pages (full-AI-workspace repositioning). Each was
  // audited against shipped code before its copy was written.
  MULTIMODAL_AI = 'multimodal-ai',
  FILES_FROM_CHAT = 'files-from-chat',
  SMART_ATTACHMENTS = 'smart-attachments',
  NARRATED_RESEARCH = 'narrated-research-and-web-crawling',
  ORCHESTRATION_LABS = 'orchestration-labs',
  CONVERSATION_TOOLS = 'conversation-power-tools',
  READ_ALOUD = 'read-aloud',
  IMAGE_GENERATION = 'image-generation',
  RELIABILITY = 'reliability',
  PAY_AS_YOU_GO_CREDIT = 'pay-as-you-go-credit',
  ADMINISTRATION_AND_ACCESS = 'administration-and-access-control',
}
