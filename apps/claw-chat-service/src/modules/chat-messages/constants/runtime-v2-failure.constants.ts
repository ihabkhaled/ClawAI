// Bounded because the reason travels on an event whose payload is size-capped,
// and because an unbounded provider message is a redaction risk.
export const RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS = 400;

export const RUNTIME_V2_UNKNOWN_FAILURE_CODE = 'RUNTIME_RUN_FAILED';

export const RUNTIME_V2_STREAM_ERROR_EVENT_TYPE = 'stream.error';

// The denial body the admission script returns once a run has used up its tool
// budget. It is singled out from the other denial reasons because it is the one
// a run can never recover from: no further invocation will ever be admitted, so
// it has to end the run rather than leave the client waiting on a stream that
// will produce nothing more.
export const RUNTIME_V2_BUDGET_EXHAUSTED_REASON = 'BUDGET_EXHAUSTED';

export const RUNTIME_V2_BUDGET_EXHAUSTED_CODE = 'RUNTIME_BUDGET_EXHAUSTED';

// Shown to the user in place of a run that would otherwise stop mid-task with
// no answer and no error, so it has to say what to do next, not just what broke.
export const RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE =
  'The run used all of its allowed tool calls before finishing. Narrow the request or raise the tool budget, then try again.';
