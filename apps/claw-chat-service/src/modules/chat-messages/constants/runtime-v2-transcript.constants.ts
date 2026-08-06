// Neither the model's tool REQUEST nor the tool RESULT was ever persisted, so
// the conversation a continuation turn saw was the user's prompt and nothing
// else. With no record of its own actions the model re-planned from scratch
// every turn and reissued calls it had already made — one run got its answer on
// calls 1 and 2, then repeated the identical pair seven more times until the
// tool budget died and the user got no answer at all.
//
// Persisting both sides turns the thread into the ordinary agent transcript the
// model expects: user → assistant(tool request) → tool(result) → …

// A tool result is bounded before it reaches the transcript. The whole result
// already travels to the model on the turn it arrives; the transcript copy only
// has to be enough to recognise "I already did this", and ~16 unbounded results
// would crowd out the conversation they are meant to inform.
export const RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS = 2_000;

export const RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE = '…[result truncated in transcript]';

export const RUNTIME_V2_TRANSCRIPT_REQUEST_PREFIX = 'Tool request';
export const RUNTIME_V2_TRANSCRIPT_RESULT_PREFIX = 'Tool result';
