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
  // Research-enricher lifecycle stages. Emitted before/during/after the
  // compare-mode research-enricher pipeline so the FE rich-progress panel
  // can show live web-research activity (search, per-URL fetch, completion,
  // failure) instead of a generic "thinking" spinner. Stages mirror the
  // RuntimeProgressStage.RESEARCH_* family on the cross-service envelope.
  RESEARCH_STARTED = 'research_started',
  RESEARCH_SOURCES_FOUND = 'research_sources_found',
  RESEARCH_FETCHING = 'research_fetching',
  RESEARCH_COMPLETED = 'research_completed',
  RESEARCH_FAILED = 'research_failed',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
  RETRYING = 'retrying',
  RATE_LIMITED = 'rate_limited',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}
