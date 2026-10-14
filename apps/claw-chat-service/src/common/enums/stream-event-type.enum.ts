export enum StreamEventType {
  CHUNK = 'chunk',
  // Rich streaming events (live token/reasoning/metric deltas).
  LIFECYCLE = 'lifecycle',
  CONTENT_DELTA = 'content_delta',
  REASONING_DELTA = 'reasoning_delta',
  METRICS = 'metrics',
  USAGE = 'usage',
  REQUEST_ACCEPTED = 'request_accepted',
  ROUTER_STARTED = 'router_started',
  ROUTER_COMPLETED = 'router_completed',
  TOOL_STARTED = 'tool_started',
  TOOL_COMPLETED = 'tool_completed',
  // Emitted once when the Ollama Cloud agentic tool loop hits the
  // iteration / total-timeout cap. The chat-service then issues one
  // wrap-up POST without `tools` so the model is forced to produce a
  // final text answer; the FE renders a small "research budget reached"
  // hint under the assistant reply.
  TOOL_LOOP_CAP_REACHED = 'tool_loop_cap_reached',
  RESEARCH_STARTED = 'research_started',
  RESEARCH_COMPLETED = 'research_completed',
  // Fine-grained lifecycle frame for the compare-mode research enricher.
  // One StreamEventType, multiple sub-stages via AiStreamStage.RESEARCH_*.
  // Carries an optional `researchDetails` payload (mode / query / sources
  // count / current URL / error) so the FE rich-progress panel can render
  // live web-research activity.
  RESEARCH_PROGRESS = 'research_progress',
  // One line of the turn's narrated work log (plan, crawl, search, back to the
  // AI, thinking). Also stored on the answer, so it survives a refresh.
  NARRATION = 'narration',
  // A plugin tool needs the user's yes: the turn is parked and the chat shows the consent card.
  // The frame carries a redacted preview; the request itself lives in plugin-service, so a
  // reload re-reads it from there. RESOLVED follows when the user answered or it timed out.
  PLUGIN_CONSENT_REQUESTED = 'plugin_consent_requested',
  PLUGIN_CONSENT_RESOLVED = 'plugin_consent_resolved',
  DONE = 'done',
  ERROR = 'error',
  FALLBACK_ATTEMPT = 'fallback_attempt',
  JUDGE_EVALUATING = 'judge_evaluating',
  PROVIDER_SELECTED = 'provider_selected',
  MODEL_PROGRESS = 'model_progress',
  RESPONSE_STREAMING = 'response_streaming',
  // Emitted once when a reply's output ceiling was cut down to what the user's
  // remaining pay-as-you-go credit could pay for. The FE renders an "answer
  // shortened — add credit" notice. Without it a clamped reply is
  // indistinguishable from a model that simply stopped early.
  PAYG_CREDIT_CLAMPED = 'payg_credit_clamped',
}
