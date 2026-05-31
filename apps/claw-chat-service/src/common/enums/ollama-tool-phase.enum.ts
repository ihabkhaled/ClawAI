// Lifecycle phase of a single Ollama Cloud tool_call inside the agentic
// loop. STARTED is emitted before the tool dispatch; COMPLETED is
// emitted once the dispatch returns (success or surfaced-error result).
// Used by ChatExecutionManager.emitToolLifecycle to label TOOL_STARTED
// vs TOOL_COMPLETED SSE events.
export enum OllamaToolPhase {
  STARTED = 'started',
  COMPLETED = 'completed',
}
