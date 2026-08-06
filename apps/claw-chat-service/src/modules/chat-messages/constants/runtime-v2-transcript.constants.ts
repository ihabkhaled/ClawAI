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
export const RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS = 800;

export const RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE = '…[result truncated in transcript]';

// How many of the most recent transcript entries survive intent filtering.
//
// The thread filter keeps a message only when it shares ~45% of its tokens with
// the current question, then caps the survivors at four. That is reasonable for
// ordinary chat history and exactly wrong for an agent's working memory: a tool
// result shares almost no words with "list scripts/ and tell me what claw.sh
// does", so the entire transcript was dropped before it reached the model and
// the agent kept reissuing calls it had already made. The trail is kept whole
// up to this bound, which covers a full tool budget of request/result pairs.
export const RUNTIME_V2_TRANSCRIPT_RETAINED_ENTRIES = 24;

// Context budget for an agent continuation, in tokens.
//
// The default is 4096, and the assembler truncates the whole prompt to
// budget x 4 characters by splicing out the middle. A tool trail pushed the
// prompt far past 16 KB, so the splice removed part of the instruction and the
// question, and the provider answered with nothing at all -- surfacing as
// CLOUD_PROVIDER_EMPTY_RESPONSE and a dead run. An agent turn legitimately
// carries its whole working trail, so it gets a budget sized for one.
export const RUNTIME_V2_CONTEXT_TOKEN_BUDGET = 32_000;

// Output budget for one agent turn, in tokens.
//
// An agent turn produces one small tool object or a final answer, and the tool
// object is the largest of the two only when it carries a file's contents. The
// cloud lane had no explicit cap here, so it fell back to the defensive default
// meant for single-shot chat: reserve `ctx - prompt - 256` for the answer,
// which came to roughly 26,000 tokens. Reserving almost the whole window for
// output leaves nothing for the prompt, and around the tenth tool step Ollama
// stopped generating altogether — answering in under a second with
// `done_reason: load`, `eval_count: 0` and, decisively, `prompt_eval_count: 0`:
// it never evaluated a prompt at all. A turn is bounded here instead, which is
// both generous for what a turn emits and honest about what the window holds.
export const RUNTIME_V2_MAX_OUTPUT_TOKENS = 8_192;
