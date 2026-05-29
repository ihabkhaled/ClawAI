// Lifecycle stages for a single AI model stream run. Emitted on LIFECYCLE
// events so the UI can show "Connecting", "Waiting for first token",
// "Generating", etc. instead of a generic spinner.
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
