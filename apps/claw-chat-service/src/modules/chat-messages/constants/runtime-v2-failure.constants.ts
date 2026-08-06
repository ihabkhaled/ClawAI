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

// A model that announces work, is told the loop exists, and announces again has
// not answered the request. Storing that as a completed answer is the silent
// stop users see: the panel shows "I'll start by…" and the task is over.
export const RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE = 'MODEL_ANNOUNCED_WITHOUT_ACTING';

export const RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_MESSAGE =
  'The model described the work but never requested a tool, so nothing ran. Try again, or choose a model proven to use tools. It said:';

export const RUNTIME_V2_ANNOUNCEMENT_EXCERPT_CHARACTERS = 300;

export const RUNTIME_V2_BUDGET_EXHAUSTED_CODE = 'RUNTIME_BUDGET_EXHAUSTED';

// Shown to the user in place of a run that would otherwise stop mid-task with
// no answer and no error, so it has to say what to do next, not just what broke.
export const RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE =
  'The run used all of its allowed tool calls before finishing. Narrow the request or raise the tool budget, then try again.';

// A provider that returns an empty completion kills an agent run outright, even
// when the run has already done real work — a tool had executed and its result
// was in hand. Emptiness is usually transient, so one bounded retry recovers the
// run instead of discarding it.
export const RUNTIME_V2_EMPTY_RESPONSE_CODE = 'CLOUD_PROVIDER_EMPTY_RESPONSE';

export const RUNTIME_V2_EMPTY_RESPONSE_RETRIES = 2;

// The model was asked once more for a valid Runtime Protocol tool object and
// still did not produce one. The run cannot continue, but nothing here is a
// fault in this service: raising the parse error let it reach the exception
// filter, and the user was shown "Internal server error" fourteen tool steps
// into a run that had been going well, with nothing to act on.
export const RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE = 'MODEL_TOOL_REQUEST_UNREPAIRABLE';

export const RUNTIME_V2_UNREPAIRABLE_REQUEST_MESSAGE =
  'The model asked for a tool ClawAI could not act on, and its corrected attempt was no better. Try again, or choose a model proven to use tools. It sent:';
