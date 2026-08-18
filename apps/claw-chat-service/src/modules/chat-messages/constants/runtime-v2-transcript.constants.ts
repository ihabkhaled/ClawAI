// Neither the model's tool REQUEST nor the tool RESULT was ever persisted, so
// the conversation a continuation turn saw was the user's prompt and nothing
// else. With no record of its own actions the model re-planned from scratch
// every turn and reissued calls it had already made — one run got its answer on
// calls 1 and 2, then repeated the identical pair seven more times until the
// tool budget died and the user got no answer at all.
//
// Persisting both sides turns the thread into the ordinary agent transcript the
// model expects: user → assistant(tool request) → tool(result) → …

// A tool result is bounded before it reaches the transcript. Continuations keep
// at most twenty messages, so at most ten results can reach one provider turn.
// A 16 KiB per-result ceiling therefore consumes at most ~40k tokens, leaving
// more than half of the 96k continuation budget for instructions, requests and
// the current result. The former 400-character ceiling discarded even a small
// source file before the following model turn could use it to construct a
// patch, leaving only the path/hash identity and causing read/retry loops.
export const RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS = 16_384;

export const RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE = '…[result truncated in transcript]';

// How long a single string leaf may be before the transcript copy clips it.
//
// The bound above used to be applied by slicing the SERIALISED result at 400
// characters. That cut wherever 400 landed, which is inside `structured` — and
// `structured` is where a read result carries its `hash`, the value `patch`
// requires to write the file back. So the one field the next turn genuinely
// needed was the field most reliably destroyed, while a file's `content` (which
// the model had already seen in full on the turn it arrived) was what consumed
// the budget.
//
// Observed live, in the agent's own words, mid-run:
//   "The transcript is truncating the `content` field so I can't see the `hash`
//    value. The initial system message gave me the hash: sha256:9720087b… Let
//    me use that."
// It then patched with a hash captured many edits earlier, the write was
// rejected as stale, it re-read, and the loop closed. That cost more turns in
// this mission than any other single cause.
//
// Clipping per-leaf instead of per-document keeps every short scalar — hash,
// path, byteLength, status, lineCount — and spends the truncation budget only
// on the bulky values nobody needs a second time.
export const RUNTIME_V2_TRANSCRIPT_FIELD_CHARACTERS = 120;

// How many elements of an array leaf survive. A `list`/`glob`/`search` result is
// a long array of short strings: the head answers "did I already run this?", and
// the count in the notice keeps the size honest.
export const RUNTIME_V2_TRANSCRIPT_ARRAY_ELEMENTS = 8;

// The floor a string leaf is never clipped below.
//
// `sha256:` plus 64 hex digits is 71 characters, so any budget under that
// destroys the very field this whole mechanism exists to protect. When the
// clipped document still exceeds the bound, leaves LONGER than this are dropped
// outright rather than shortened further, and everything at or under it — hash,
// path, status, counts — survives whole. Truncation must never again be able to
// eat an identifier while keeping a fragment of a payload.
export const RUNTIME_V2_TRANSCRIPT_IDENTITY_CHARACTERS = 96;

// Progressive tightening applied until the record fits the bound above: string
// budget paired with array-element budget, loosest first.
export const RUNTIME_V2_TRANSCRIPT_CLIP_STEPS = [
  {
    strings: RUNTIME_V2_TRANSCRIPT_FIELD_CHARACTERS,
    elements: RUNTIME_V2_TRANSCRIPT_ARRAY_ELEMENTS,
  },
  { strings: RUNTIME_V2_TRANSCRIPT_IDENTITY_CHARACTERS, elements: 2 },
  { strings: RUNTIME_V2_TRANSCRIPT_IDENTITY_CHARACTERS, elements: 0 },
] as const;

// How many of the most recent transcript entries survive intent filtering.
//
// The thread filter keeps a message only when it shares ~45% of its tokens with
// the current question, then caps the survivors at four. That is reasonable for
// ordinary chat history and exactly wrong for an agent's working memory: a tool
// result shares almost no words with "list scripts/ and tell me what claw.sh
// does", so the entire transcript was dropped before it reached the model and
// the agent kept reissuing calls it had already made. The trail is kept whole
// up to this bound, which covers a full tool budget of request/result pairs.
//
// This bound has to track the effort budget, and it stopped doing so. It was
// sized for the legacy 40-turn run; ULTRA now buys 100 model turns and 250 tool
// calls. At two entries per step — request and result — 24 entries remembered
// only twelve steps, so a feature-scale run on a large monorepo forgot its
// early discovery and re-read files it had already read. A live run was
// observed reading one file six times in a row and then dying of the turn
// budget without writing anything. Sized for the whole ceiling instead.
export const RUNTIME_V2_TRANSCRIPT_RETAINED_ENTRIES = 200;

// Context budget for an agent continuation, in tokens.
//
// The default is 4096, and the assembler truncates the whole prompt to
// budget x 4 characters by splicing out the middle. A tool trail pushed the
// prompt far past 16 KB, so the splice removed part of the instruction and the
// question, and the provider answered with nothing at all -- surfacing as
// CLOUD_PROVIDER_EMPTY_RESPONSE and a dead run. An agent turn legitimately
// carries its whole working trail, so it gets a budget sized for one.
//
// Raised with the retained trail above: 200 entries of up to 400 characters is
// roughly 30k tokens of transcript before the instruction, the tool catalog and
// the pinned user message are added. 32k left no room for them and the splice
// would have eaten the instruction again. Every model this lane targets carries
// a window far larger than this.
export const RUNTIME_V2_CONTEXT_TOKEN_BUDGET = 96_000;

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
//
// Raised once the agent started mutating files. A turn that only reads emits a
// tiny object, but a `patch` carries the exact text being replaced AND its
// replacement, and a `create` carries a whole file — with JSON escaping on top.
// At 8_192 those turns were cut off mid-object, which surfaced as the model
// "starting a tool object and not finishing it" and ended runs that were
// otherwise doing the right thing. Still far below the context budget above, so
// the prompt keeps its room.
// Raised a second time, from 16_384, when the same failure returned: a model
// writing a unit test in one `create` was cut off mid-`operations` twice and
// the run ended UNREPAIRABLE. A test file with real comments is a few thousand
// tokens before escaping, and the turn also carries reasoning, so 16_384 left
// no margin. The ceiling is not the whole answer — the truncation message now
// tells the model to write shorter and append — but a `create` that cannot fit
// an ordinary source file is a limit set below the job.
export const RUNTIME_V2_MAX_OUTPUT_TOKENS = 32_768;
