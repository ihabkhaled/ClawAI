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

/**
 * An upstream failure that says nothing about the request.
 *
 * A provider answering 500 used to end the run exactly as a 400 did, and the
 * two mean opposite things: a 400 says the request is wrong and repeating it is
 * pointless, a 500 says the provider had a bad moment. Every non-2xx was
 * flattened into CLOUD_PROVIDER_REQUEST_FAILED with the status dropped, so the
 * runtime loop could not tell them apart and gave up on both.
 *
 * That cost a supervised run mid-task: sixteen tools admitted, files read, the
 * edit about to be written, and `OLLAMA returned error status=500` discarded
 * all of it. Separating the codes is what lets the loop retry the one worth
 * retrying.
 */
export const RUNTIME_V2_TRANSIENT_PROVIDER_CODE = 'CLOUD_PROVIDER_UNAVAILABLE';

/**
 * Upstream statuses worth repeating.
 *
 * 408 and 504 are timeouts, 429 is a rate limit, and 500/502/503 are the
 * provider failing on its own side. Every one of them can succeed on the next
 * attempt with the identical request, which is the only property that makes a
 * retry honest rather than hopeful.
 */
export const RUNTIME_V2_TRANSIENT_PROVIDER_STATUSES: readonly number[] = [
  408, 429, 500, 502, 503, 504,
];

export const RUNTIME_V2_TRANSIENT_PROVIDER_RETRIES = 3;

/** Backoff before each transient-provider retry, in milliseconds. */
export const RUNTIME_V2_TRANSIENT_PROVIDER_BACKOFF_MS: readonly number[] = [500, 2_000, 5_000];

// The model was asked once more for a valid Runtime Protocol tool object and
// still did not produce one. The run cannot continue, but nothing here is a
// fault in this service: raising the parse error let it reach the exception
// filter, and the user was shown "Internal server error" fourteen tool steps
// into a run that had been going well, with nothing to act on.
export const RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE = 'MODEL_TOOL_REQUEST_UNREPAIRABLE';

export const RUNTIME_V2_UNREPAIRABLE_REQUEST_MESSAGE =
  'The model asked for a tool ClawAI could not act on, and its corrected attempt was no better. Try again, or choose a model proven to use tools. It sent:';
