export enum StreamEventType {
  CHUNK = 'chunk',
  REQUEST_ACCEPTED = 'request_accepted',
  ROUTER_STARTED = 'router_started',
  DONE = 'done',
  ERROR = 'error',
  FALLBACK_ATTEMPT = 'fallback_attempt',
  JUDGE_EVALUATING = 'judge_evaluating',
  PROVIDER_SELECTED = 'provider_selected',
  RESPONSE_STREAMING = 'response_streaming',
}
