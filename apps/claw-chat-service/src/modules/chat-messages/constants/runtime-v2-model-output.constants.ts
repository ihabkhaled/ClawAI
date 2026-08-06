import { z } from 'zod';

import { RUNTIME_V2_ID_PATTERN } from './runtime-v2.constants';

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
  'Once the results answer the question and every requested change is applied, respond normally with the final user-facing answer and no JSON.',
].join(' ');

// The second line is what makes the correction land. Told only that its request
// was invalid, minimax-m2.7 sent the same `[TOOL_CALL] {toolName="…"}` again —
// its own trained dialect looks correct to it, so "invalid" is not information.
// Naming the shapes ClawAI does not accept, and showing the one it does, is the
// difference between a corrected turn and a run that ends having done nothing.
export const RUNTIME_V2_REPAIR_INSTRUCTION = [
  'Your previous tool request was invalid. Return exactly one valid Runtime Protocol 2.0 tool JSON object and no markdown.',
  'Do not use any other tool-call syntax: not [TOOL_CALL], not <tool_call>, not <function_call>, not functools, and no key=value pairs.',
  'The only accepted shape is a JSON object exactly like this, with real values:',
  '{"kind":"tool","toolName":"…","toolVersion":"…","operation":"…","arguments":{},"targetId":"…"}',
].join(' ');

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
export const RUNTIME_V2_TRUNCATED_TOOL_REQUEST_PATTERN = /"kind"\s*:\s*"tool"/u;

export const RUNTIME_V2_TRUNCATED_TOOL_CALL_MESSAGE =
  'The model started a Runtime Protocol 2.0 tool object and did not finish it.';

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
  /\b(?:i['’]ll|i will|let me|i['’]m going to|i am going to)(?: now)?(?: start by| begin by| first)? (?:read|list|inspect|analyz|analys|explor|discover|search|scan|check|examin|gather|review|look|open|write|creat|generat|build|map|compil|assembl)/iu,
  /\b(?:starting|beginning) (?:the )?(?:analysis|review|scan|exploration|discovery)\b/iu,
  /\bnext,? i['’]ll\b/iu,
];

// An announcement is short by nature. A genuine answer that happens to use "I'll list them here"
// carries the list with it, so bounding the length keeps a real deliverable out of the correction
// path. A false positive costs exactly one extra model turn and then accepts whatever comes back.
export const RUNTIME_V2_UNFULFILLED_INTENT_MAX_CHARACTERS = 1_200;

// Sent once when the model announced work and then stopped. It restates the loop rather than
// scolding: the model usually stops because it believes the turn is its only chance to speak.
export const RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION = [
  'Your previous response announced work but ended the turn without requesting a tool, so nothing ran.',
  'Announcing an action does not perform it. ClawAI only acts when you return a tool JSON object.',
  'This is a loop: request ONE tool now, ClawAI executes it, and you are called again with the result.',
  'Return exactly one Runtime Protocol 2.0 tool JSON object for the next step you described, and no prose.',
  'Answer in prose only when the work is actually finished and you are reporting the result.',
].join(' ');

// Sent once when the model denies a capability the admitted catalog actually grants. The statement
// must stay truthful: it asserts only what the catalog above already admitted.
export const RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION = [
  'Your previous response claimed you lack access that ClawAI has in fact granted you.',
  'The tool catalog above is live: ClawAI executes those operations on a governed workspace target on your behalf.',
  'You are not a text-only assistant in this run. Do not claim you cannot read, write, list, or execute.',
  'If you need information from the workspace, return one Runtime Protocol 2.0 tool JSON object now.',
  'Only state an inability after an admitted tool has actually returned an error.',
].join(' ');
