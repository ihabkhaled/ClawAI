// Mirrors backend AiStreamStage. Lifecycle stages shown in the live progress UI.
export enum AiStreamStage {
  QUEUED = 'queued',
  RESOLVING_ROUTE = 'resolving_route',
  RETRIEVING_CONTEXT = 'retrieving_context',
  CONNECTING_PROVIDER = 'connecting_provider',
  AUTHENTICATING = 'authenticating',
  WAITING_FIRST_TOKEN = 'waiting_first_token',
  THINKING = 'thinking',
  GENERATING = 'generating',
  TOOL_CALLING = 'tool_calling',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
  RETRYING = 'retrying',
  RATE_LIMITED = 'rate_limited',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}
