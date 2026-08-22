import { z } from 'zod';

import { RUNTIME_V2_ID_PATTERN } from './runtime-v2.constants';

/**
 * Keys a model uses for the right value under the wrong name.
 *
 * `runtimeV2ToolRequestSchema` is strict, so an unrecognised key rejects the
 * whole request. kimi-k2.7-code sent a request that was correct in every
 * respect except that it wrote `version` where the protocol says `toolVersion`:
 *
 *   {"kind":"tool","toolName":"workspace.files","version":"2.0.0",
 *    "operation":"read","arguments":{...},"targetId":"target:workspace"}
 *
 * Strict mode refused it, the repair turn made the same substitution, and the
 * run ended MODEL_TOOL_REQUEST_UNREPAIRABLE having done nothing — over one key
 * name. `version` is also what the tool catalogue itself calls that field when
 * it is advertised to the model, so the model was echoing our own vocabulary.
 *
 * Renaming a fixed set of aliases is not the same as loosening the schema.
 * Anything not listed here is still an unknown key and still rejects, the value
 * still has to satisfy its own rule, and `assertAdmittedTool` still checks the
 * name, version and operation against the admitted catalogue — so an alias
 * cannot smuggle in a tool the run was never granted.
 */
export const RUNTIME_V2_TOOL_REQUEST_KEY_ALIASES: Readonly<Record<string, string>> = {
  args: 'arguments',
  input: 'arguments',
  name: 'toolName',
  parameters: 'arguments',
  params: 'arguments',
  target: 'targetId',
  tool: 'toolName',
  tool_name: 'toolName',
  tool_version: 'toolVersion',
  version: 'toolVersion',
};

export const runtimeV2ToolRequestSchema = z
  .object({
    kind: z.literal('tool'),
    toolName: z.string().min(2).max(80),
    toolVersion: z.string().min(1).max(40).default('1.0.0'),
    operation: z.string().min(1).max(80),
    arguments: z.record(z.string(), z.unknown()),
    targetId: z.string().regex(RUNTIME_V2_ID_PATTERN),
  })
  .strict();

// "Return only one JSON object" was already here and models still emitted four
// of them concatenated, because the instruction never said what happens next. A
// model that believes it gets a single shot batches every call it can foresee.
// Stating the loop — one call, then you are asked again with the result — is
// what makes one-per-turn the obviously correct move rather than a restriction
// to work around.
export const RUNTIME_V2_MODEL_INSTRUCTION = [
  'You are operating through ClawAI Runtime Protocol 2.0.',
  'This is a multi-turn loop: request ONE tool, ClawAI executes it, and you are called again with the result.',
  'You may request as many tools as the task needs, but only ever one per response.',
  'When a tool is required, return only one JSON object with keys kind="tool", toolName, toolVersion, operation, arguments, and targetId.',
  'Never concatenate several tool objects in one response; every object after the first is discarded.',
  'Never invent credentials or embed secrets. Tool arguments must contain only JSON values.',
  // Models routinely read a workspace, summarise it, and stop — the file the
  // user asked for is described in the answer instead of created. Nothing in
  // the instruction said that describing an effect is not performing it.
  'If the request asks you to create or change a file, you must do it with a tool call: describing the file, or pasting its contents into your answer, does not create it.',
  // A supervised feature-implementation run was handed a message that already
  // named, file by file, exactly what existed and what did not — the product
  // of a prior turn's own verified work. It spent over sixty consecutive tool
  // calls re-reading, re-searching, and re-listing entries the message had
  // already settled, wrote nothing, and ended the run out of model turns with
  // every file still missing. The budget, not the task, was what it spent.
  'A message that states which files already exist and which do not is reporting the result of work already verified. Trust it. Re-read a file only to see its current content immediately before editing it, never to re-confirm a fact you were already told.',
  'Prefer acting over re-verifying: if you already know what a file needs, write it. A read, search, or list call that does not lead to a write within a turn or two is spending budget the task needs.',
  // Twice in one supervised session a model reported output it had never seen.
  // It wrote that `git push origin main` "Succeeded — main -> main" when the
  // push had been rejected non-fast-forward and the remote was unchanged, and
  // it quoted SMTP environment values that differed from what the container
  // actually held. Both readable, specific, and wrong. A reader cannot tell an
  // invented transcript from a real one, so the only safe rule is that every
  // reported result must be copied from a tool result, never reconstructed
  // from what the command was expected to print.
  'Report only what a tool result actually contained. Quote command output verbatim from the result you received; never reconstruct, summarise from memory, or predict what a command would have printed.',
  'If a command failed, was truncated, or you did not run it, say exactly that. A command that exits non-zero has failed even when its output looks reasonable, and reporting it as succeeded is the worst error you can make.',
  'Once the results answer the question and every requested change is applied, respond normally with the final user-facing answer and no JSON.',
  // The workspace.files tool's JSON schema declares `transaction` as an opaque
  // empty object — the model gets no structural cue for it at all. The only
  // place the real shape is taught is a free-text tool description, and a
  // supervised run made over 150 tool calls (read, search, list, stat) and
  // never once attempted create or patch, because it never assembled the
  // nested transaction.operations[0] object with confidence. Giving the exact
  // shape here, in the channel the model reliably reads, is the fix.
  'To create a new file with workspace.files, the call is: {"kind":"tool","toolName":"workspace.files","toolVersion":"2.0.0","operation":"create","arguments":{"transaction":{"transactionId":"<id>","summary":"<summary>","operations":[{"kind":"create","rootKey":"workspace-1","path":"<relative path>","contentLines":["line 1","line 2"],"beforeHash":null}]}},"targetId":"<target>"}. The outer operation must equal transaction.operations[0].kind. Use contentLines (array of lines) for source code, never a top-level content field.',
  'To edit an existing file, use operation "patch" with transaction.operations[0] = {"kind":"patch","rootKey":"workspace-1","path":"<relative path>","beforeHash":"<sha256 hash from a prior read of this file>","hunks":[{"beforeLines":["exact existing line(s), must occur exactly once in the file"],"afterLines":["replacement line(s)"]}]}. This is an exact-text search and replace, never a unified diff — do not send @@ hunks or +/- prefixed lines.',
  'transaction.operations must contain exactly one entry whose kind matches the outer operation. Do not add any key not shown in these examples; the schema is strict and an unrecognised key rejects the whole request.',
].join(' ');

// The second line is what makes the correction land. Told only that its request
// was invalid, minimax-m2.7 sent the same `[TOOL_CALL] {toolName="…"}` again —
// its own trained dialect looks correct to it, so "invalid" is not information.
// Naming the shapes ClawAI does not accept, and showing the one it does, is the
// difference between a corrected turn and a run that ends having done nothing.
export const RUNTIME_V2_REPAIR_INSTRUCTION = [
  'Your previous tool request was invalid. Return exactly one valid Runtime Protocol 2.0 tool JSON object and no markdown.',
  'Every key is required and spelled exactly as shown; "version" is not "toolVersion" and an unknown key rejects the whole request.',
  'Do not use any other tool-call syntax: not [TOOL_CALL], not <tool_call>, not <function_call>, not functools, and no key=value pairs.',
  'The only accepted shape is a JSON object exactly like this, with real values:',
  '{"kind":"tool","toolName":"…","toolVersion":"…","operation":"…","arguments":{},"targetId":"…"}',
].join(' ');

/**
 * Introduces the real validation error on the repair turn.
 *
 * The repair instruction already learned that "invalid" is not information — it
 * names the dialects and shows the accepted shape. It still never said what was
 * actually wrong with THIS request, because the first parse failure was caught
 * and discarded. glm-5.2 lost a run that way: its request carried a correct
 * nested transaction and every required key, and the only thing it could be
 * told was that the request was invalid, so its corrected attempt repeated the
 * same mistake and the run ended having done nothing.
 *
 * The parser's own message names the offending key or the failing rule, which
 * is exactly the missing information, so it is quoted verbatim and bounded.
 */
export const RUNTIME_V2_REPAIR_DIAGNOSIS_PREFIX = 'The exact validation error was:';

export const RUNTIME_V2_REPAIR_DIAGNOSIS_CHARACTERS = 600;

// Markers a model uses to announce a tool call in its own dialect rather than
// in the protocol's JSON. minimax-m2.7 answered the very first turn with
// `I'll start by exploring the workspace structure. [TOOL_CALL]
// {toolName="workspace.files", toolVersion=…}` — key=value, not JSON, so the
// parser could make nothing of it and handed the whole thing to the user as the
// assistant's answer. The task ended there, having done nothing, and what the
// user read was raw tool syntax.
//
// A response carrying one of these was ATTEMPTING to call a tool, which is the
// same signal `kind: "tool"` gives for a well-formed request, and it belongs in
// the repair turn. Being wrong here costs one extra turn; missing it costs the
// user their answer. Compared lower-cased, so each entry is written that way.
export const RUNTIME_V2_TOOL_CALL_DIALECT_MARKERS: readonly string[] = [
  '[tool_call]',
  '<|tool_call|>',
  '<tool▁call>',
  'functools[',
];

// The tag forms, matched by shape rather than by exact spelling. A literal list
// could not keep up: `<tool_call>` was in it and `<minimax:tool_call>` was not,
// so an Enterprise-locked run answered with
// `<minimax:tool_call> <kind>"tool","toolName":"workspace.files"…` and the tag
// soup was shown to the user as the assistant's response. Any element whose name
// ends in some spelling of tool-call or function-call is the same attempt.
export const RUNTIME_V2_TOOL_CALL_TAG_PATTERN =
  /<\/?[a-z0-9_.:-]*(?:tool|function)[_▁-]?call[^>]*>/iu;

export const RUNTIME_V2_DIALECT_TOOL_CALL_MESSAGE =
  'The model asked for a tool in a format Runtime Protocol 2.0 does not accept.';

// A reply that opens with the protocol's own discriminator and then fails to
// parse. glm-5.2 answered with
// `{"kind":"tool","toolName":"workspace.files",…,"arguments":{…,"targetId":…`
// and the object never closed, so JSON.parse rejected it, the reply fell through
// to the final-answer branch, and a half-written tool request was shown to the
// user as the assistant's response. No real answer begins this way; this is an
// attempt at a tool call that did not survive, and it belongs in the repair turn.
// Deliberately unanchored. It is consulted only after parsing has already
// failed, so a reply carrying the protocol's own discriminator anywhere in it is
// a tool call that did not survive, wherever it sits. An Ask-mode run answered
// with `${JSON.stringify({"kind":"tool","toolName":"workspace.files"…})}` — the
// object wrapped in a JavaScript template literal — and an anchored pattern let
// that reach the user as the answer.
// The closing quote is NOT required, and that is the whole point. This guard is
// consulted only after parsing failed, so the discriminator it is looking for is
// itself likely to be damaged — and when the damage lands on that exact quote,
// a pattern demanding `"tool"` misses the one case it exists to catch. Observed
// live: glm-5.2 emitted
//     {"kind":"tool,"toolName":"workspace.files","operation":"read",…}
// — a single missing quote after `tool`. The document did not parse, the guard
// did not recognise it, the reply fell through to the "final answer" branch, and
// that raw JSON was shown to the user as the assistant's response while the run
// ended having done nothing. One character.
//
// `\b` keeps it honest: it matches `"tool"`, `"tool,` and a bare `"tool` at the
// end of a truncated reply, but not `"toolbox"`, because there is no word
// boundary between `l` and `b`.
// The quote is optional on BOTH sides of `tool`. This started as `"kind":"tool"`
// with the closing quote required, which missed a reply damaged one character
// earlier — glm-5.2 emitted `{"kind":tool","toolName":"workspace.files",…}`,
// missing the OPENING quote. JSON.parse rejected it, the guard did not
// recognise it, so a malformed tool request was shown to the user as the
// assistant's answer and the run ended having done nothing. Either quote can be
// the one that goes missing, so neither is required to match.
export const RUNTIME_V2_TRUNCATED_TOOL_REQUEST_PATTERN = /"kind"\s*:\s*"?tool\b/u;

/**
 * What the model is told when its tool object was cut off mid-JSON.
 *
 * The old sentence stopped at "did not finish it", which describes the symptom
 * and implies the object was malformed. A model reading that concludes it made
 * a syntax error and sends the identical object again — the same length, the
 * same truncation, and the run ends UNREPAIRABLE having done nothing.
 *
 * It is almost never a syntax error. A `create` carries an entire file inline
 * with JSON escaping on top, so the reply simply reached the output-token
 * ceiling. The one thing that helps is knowing the object must be SHORTER, and
 * that a long file is written by creating a small one and appending to it.
 * Observed with kimi-k2.7-code writing a unit test: the request was cut off in
 * the middle of the `operations` array twice in a row.
 */
export const RUNTIME_V2_TRUNCATED_TOOL_CALL_MESSAGE = [
  'The model started a Runtime Protocol 2.0 tool object and did not finish it.',
  'This is almost always length, not syntax: the reply hit the output-token limit part-way through the JSON.',
  'Send the same request with a SHORTER body — write a small file first and append the rest in later turns, or patch fewer lines per call.',
  'Do not resend an object of the same size; it will be cut off at the same place.',
].join(' ');

// An agent-self capability denial: the model claiming it has no filesystem, command, workspace, or
// tool authority. When a tool catalog was admitted that claim is false, and recording it as a
// successful final answer is the runtime lying to the user. Deliberately narrow — it must not catch
// a genuine safety refusal ("I will not help exfiltrate…") or a truthful factual negative ("the file
// does not exist"), both of which remain valid final answers.
//
// Callers normalize runs of whitespace to a single space first, so these patterns match literal
// single spaces rather than `\s+`. That keeps them linear-time and free of the nested quantifiers
// that make alternation-heavy expressions vulnerable to catastrophic backtracking.
export const RUNTIME_V2_CAPABILITY_DENIAL_PATTERNS: readonly RegExp[] = [
  /\bi (?:can't|cannot|am unable to) (?:directly )?(?:access|read|open|browse|write|edit|modify|create|run|execute|list|navigate)\b/iu,
  /\bi (?:do not|don't) have (?:the )?(?:ability|access|permission) to\b/iu,
  /\bi (?:do not|don't) have access to\b/iu,
  /\b(?:as|being) an? (?:ai|text-based|text based|language) (?:model|assistant)\b[^.]{0,80}\b(?:can't|cannot|unable)\b/iu,
  /\bi (?:can't|cannot) (?:interact with|operate on) (?:your|the) (?:file system|filesystem|machine|computer|workspace)\b/iu,
];

// An announced-but-unfulfilled intent: the model says it is about to read, list or write something
// and then ends its turn, so the runtime stores "I'll start by discovering the workspace structure"
// as the completed answer and the task stops after one step. Every multi-step request died this
// way. Deliberately narrow, and only ever applied together with the length bound below.
// Models write "I’ll" with a typographic apostrophe as often as "I'll", and a
// pattern that accepts only the straight quote silently misses half of them —
// observed live: "I’ll start by discovering the workspace layout" sailed through
// as a completed answer. Every apostrophe here matches both forms.
export const RUNTIME_V2_UNFULFILLED_INTENT_PATTERNS: readonly RegExp[] = [
  // `compil` and `assembl` are here because an Auto-edit run made twelve real
  // tool calls and then ended with "Now I'll compile all the gathered
  // information into the document" — every verb in this list except the one it
  // reached for. The leading "Now" needs nothing: `\b` matches at "I'll"
  // whatever precedes it, and an optional prefix group here would only add the
  // ambiguity these patterns are deliberately written without.
  //
  // The adverb group and the second half of the verb list were added after a
  // supervised password-reset run stalled three times, each on an announcement
  // this pattern did not reach:
  //   "Let me ALSO READ the reset-password-form.tsx imports"  — the adverb sits
  //      between the lead-in and the verb, and only ` now` was tolerated there
  //   "Let me TRY invoking npm directly instead"              — verb not listed
  //   "Let me APPLY Patch B"                                  — verb not listed
  // Each ended the run and cost a supervisor turn to restart. The original list
  // was drawn from DISCOVERY runs, so it covers reading and analysing well and
  // omits the vocabulary of an agent that is MUTATING code — apply, patch, fix,
  // add, replace, run. A coding agent spends most of its turns in that second
  // register, which is exactly where the safety net had a hole.
  //
  // A fourth stall — "I'll INSERT const router = useRouter()" — arrived after
  // the first widening and is the honest limit of this approach: an allow-list
  // of verbs will always have another hole, because the set of things a model
  // can announce is the set of English verbs. The principled fix is to make a
  // final answer explicit in the protocol — a `kind: "final"` document mirroring
  // `kind: "tool"` — so that bare prose is a continuation by definition and no
  // vocabulary has to be guessed. Until that lands, this list is kept wide
  // across the mutation register and every live miss is added as a regression.
  /\b(?:i['’]ll|i will|let me|i['’]m going to|i am going to|i need to|i should)(?: (?:now|also|just|then|next|quickly|simply|instead))?(?: start by| begin by| first)? (?:read|list|inspect|analyz|analys|explor|discover|search|scan|check|examin|gather|review|look|open|write|creat|generat|build|map|compil|assembl|try|apply|add|fix|updat|patch|swap|replac|implement|remov|delet|run|execut|invok|send|use|verify|test|install|refactor|renam|move|extract|wire|finish|complet|insert|place|put|modif|chang|adjust|correct|handle|address|do|make|set|defin|declar|import|export|call|switch|revert|restor|clean|split|merg|bump|stage|commit)/iu,
  // `i need to` and `i should` joined the lead-ins above because
  // kimi-k2.7-code opened a full feature task with "I need to start by
  // reading the repository conventions" and stopped there: no tool call, and
  // the announcement was handed to the user as the answer.
  //
  // This pattern catches the second sentence of that same turn, "Let me begin
  // with CLAUDE.md and the rules/ directory". There `begin` is the verb rather
  // than the optional prefix and the preposition is `with`, so neither the
  // verb list nor `begin by` reaches it. Requiring a following non-space token
  // keeps a bare "let me start" - an announcement of nothing in particular -
  // out of the correction path.
  /\b(?:i['’]ll|i will|let me|i['’]m going to|i am going to|i need to|i should)(?: now)? (?:start|begin|proceed|continue)(?: with| by)? \S/iu,
  /\b(?:starting|beginning) (?:the )?(?:analysis|review|scan|exploration|discovery)\b/iu,
  /\bnext,? i['’]ll\b/iu,
  // Announcements with NO first-person lead-in at all, which every pattern above
  // requires. Captured live: "Now starting PART B by reading the email adapter
  // lines 1-40 to model the new sendPasswordReset method". No "I'll", no "let
  // me" — just a bare gerund — and the run ended there with the work undone.
  // Anchored on a task marker rather than on the bare gerund. "The migration is
  // now starting to look correct" is an ordinary sentence and must not be sent
  // back for another turn; "Now starting PART B" is an announcement.
  /\b(?:starting|beginning|resuming|proceeding with|continuing with|moving on to)\s+(?:part|step|item|phase|task|section)\b/iu,
  // "…by reading the adapter", "…by patching the service". A trailing gerund
  // clause describing the METHOD of the next action is an announcement whatever
  // the sentence opened with.
  /\bby (?:read|re-read|patch|add|creat|updat|modif|check|examin|inspect|fix|appl|insert|replac|remov)\w*ing\b/iu,
  // "Now writing the file", "Next creating the spec". Same bare-gerund shape as
  // above but with a work verb rather than a task noun. deepseek-v4-pro ended a
  // run with "Now writing the file — CALL 4, creating with imports…" after
  // completing every read it needed.
  // The `(?!-)` matters: "the token is now writing-protected in storage" is an
  // ordinary sentence, and a hyphenated compound is never an announcement.
  /\b(?:now|next|then)\s+(?:i\s+am\s+)?(?:writing|creating|adding|patching|reading|applying|running|building|updating|appending)(?!-)\b/iu,
  // A reply that signs off by naming the numbered step it is about to perform,
  // typically ending in a colon. No real answer ends "— CALL 4, creating with
  // imports + describe + beforeEach:".
  /\b(?:call|step|item|phase)\s*\d+\b[^.!?]*:\s*$/iu,
  // "Sending CALL 5 now." — the same announcement, ended with a period instead
  // of a colon, which the pattern above required. Captured live from
  // deepseek-v4-pro after it had listed every call it intended to make.
  /\b(?:sending|issuing|executing|running|starting|doing)\s+(?:call|step|item|phase)\s*\d+\b/iu,
  /\b(?:call|step|item|phase)\s*\d+\s+now\b/iu,
  // A reply that ENDS on a colon is promising something it never delivered.
  // Captured live: "…Let me apply both edits with sed. First, replace the
  // success test's submit block (lines 44-48):" — the announcement itself sat
  // too far back for the tail window, but the trailing colon is unambiguous. A
  // finished answer does not end by introducing what comes next.
  /[^:]:\s*$/u,
  // The allow-list above lost a race it could not win. Four live stalls, four
  // verbs it did not carry — apply, try, insert, and finally "let me RE-READ",
  // which the list missed because `re-read` is not `read`. Every miss ends a
  // run mid-task, and the set of things a model can announce is the set of
  // English verbs, so enumerating them is not a strategy.
  //
  // Inverted here: any short reply whose lead-in is a first-person statement of
  // intent is an announcement, UNLESS the word after it belongs to the small
  // set that genuinely opens an answer. That set is what needs enumerating, and
  // unlike the verbs it is closed and short — a model declining, hedging,
  // explaining, or signing off.
  //
  // Two things bound the damage of a false positive: the length cap below keeps
  // real deliverables out entirely, and a wrong hit costs one extra model turn
  // which then accepts whatever comes back. A false NEGATIVE, by contrast,
  // silently ends the task — which is the failure this whole mechanism exists
  // to prevent, so the trade is deliberately asymmetric.
  //
  // The trailing `\s+\S` preserves a decision the narrower pattern above already
  // made: a bare "Let me start." announces nothing in particular and stays out
  // of the correction path, while "Let me re-read both files" does not.
  /\b(?:i['’]ll|i will|let me|i['’]m going to|i am going to|i need to|i should)(?: (?:now|also|just|then|next|quickly|simply|instead|first))? (?!know\b|not\b|never\b|be\b|have\b|assume\b|note\b|mention\b|clarify\b|explain\b|warn\b|recommend\b|suggest\b|avoid\b|leave\b|defer\b|skip\b|stop\b|refuse\b|decline\b|point\b|emphasi|highlight\b|reiterate\b|say\b|admit\b|caution\b)[a-z][a-z-]{1,}\s+\S/iu,
];

// An announcement is short by nature. A genuine answer that happens to use "I'll list them here"
// carries the list with it, so bounding the length keeps a real deliverable out of the correction
// path. A false positive costs exactly one extra model turn and then accepts whatever comes back.
export const RUNTIME_V2_UNFULFILLED_INTENT_MAX_CHARACTERS = 1_200;

// How much of an OVER-LENGTH reply is still examined, taken from the end.
//
// The cap above exists so a genuine deliverable — a reply that says "I'll list
// them here" and then lists them — is not mistaken for an announcement. But it
// also meant a model could reason for two paragraphs, close with "Let me start
// with FIX 1", and sail past the guard because the whole reply was too long to
// inspect. That is still an announcement, and the run still ended having done
// nothing.
//
// What makes a reply an announcement is how it ENDS. A real answer does not
// finish by declaring its next action, so the tail is the discriminating part
// and it is judged even when the whole is long.
export const RUNTIME_V2_UNFULFILLED_INTENT_TAIL_CHARACTERS = 240;

// Sent once when the model announced work and then stopped. It restates the loop rather than
// scolding: the model usually stops because it believes the turn is its only chance to speak.
export const RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION = [
  'Your previous response announced work but ended the turn without requesting a tool, so nothing ran.',
  'Announcing an action does not perform it. ClawAI only acts when you return a tool JSON object.',
  'This is a loop: request ONE tool now, ClawAI executes it, and you are called again with the result.',
  'Return exactly one Runtime Protocol 2.0 tool JSON object for the next step you described, and no prose.',
  'Answer in prose only when the work is actually finished and you are reporting the result.',
].join(' ');

/**
 * How many times a run may be nudged back into acting before it is failed.
 *
 * One nudge was too few. Narration is a habit, not a refusal: glm-5.2 answered
 * "I need to see the exact lines around the two patch targets. Let me read the
 * specific line ranges…" — a correct next step, described instead of requested
 * — and a single correction ended a run that had already read the file it was
 * asked to change. A model that has issued a valid tool call has proven it can,
 * so the loop asks again rather than discarding the work done so far.
 *
 * Bounded, because a model that narrates three times running is not going to
 * act on the fourth ask, and each attempt costs a model turn from the same
 * budget the real work needs.
 */
export const RUNTIME_V2_INTENT_CORRECTION_ATTEMPTS = 3;

// Sent once when the model denies a capability the admitted catalog actually grants. The statement
// must stay truthful: it asserts only what the catalog above already admitted.
export const RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION = [
  'Your previous response claimed you lack access that ClawAI has in fact granted you.',
  'The tool catalog above is live: ClawAI executes those operations on a governed workspace target on your behalf.',
  'You are not a text-only assistant in this run. Do not claim you cannot read, write, list, or execute.',
  'If you need information from the workspace, return one Runtime Protocol 2.0 tool JSON object now.',
  'Only state an inability after an admitted tool has actually returned an error.',
].join(' ');

/**
 * How many opening braces are tried when looking for the tool object.
 *
 * The candidate slice starts at the FIRST brace in the reply, which belongs to
 * the prose as soon as a model explains itself or shows a code sample. Every
 * brace is tried instead, bounded so a long reply cannot become a quadratic
 * scan.
 */
export const RUNTIME_V2_TOOL_OBJECT_SCAN_LIMIT = 32;
