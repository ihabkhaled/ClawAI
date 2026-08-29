export enum StreamEventType {
  CHUNK = 'chunk',
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
  RESEARCH_STARTED = 'research_started',
  RESEARCH_COMPLETED = 'research_completed',
  DONE = 'done',
  ERROR = 'error',
  FALLBACK_ATTEMPT = 'fallback_attempt',
  JUDGE_EVALUATING = 'judge_evaluating',
  PROVIDER_SELECTED = 'provider_selected',
  MODEL_PROGRESS = 'model_progress',
  RESPONSE_STREAMING = 'response_streaming',
  // The answer was shortened to fit the user's remaining pay-as-you-go credit.
  // Its own frame rather than a generic progress stage, because a silently
  // truncated reply reads as the model being bad instead of the wallet
  // being nearly empty. Mirrors chat-service's StreamEventType.
  PAYG_CREDIT_CLAMPED = 'payg_credit_clamped',
}
