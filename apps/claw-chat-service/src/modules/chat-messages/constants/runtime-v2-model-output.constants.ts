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
  'Once the results answer the question, respond normally with the final user-facing answer and no JSON.',
].join(' ');

export const RUNTIME_V2_REPAIR_INSTRUCTION =
  'Your previous tool request was invalid. Return exactly one valid Runtime Protocol 2.0 tool JSON object and no markdown.';

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

// Sent once when the model denies a capability the admitted catalog actually grants. The statement
// must stay truthful: it asserts only what the catalog above already admitted.
export const RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION = [
  'Your previous response claimed you lack access that ClawAI has in fact granted you.',
  'The tool catalog above is live: ClawAI executes those operations on a governed workspace target on your behalf.',
  'You are not a text-only assistant in this run. Do not claim you cannot read, write, list, or execute.',
  'If you need information from the workspace, return one Runtime Protocol 2.0 tool JSON object now.',
  'Only state an inability after an admitted tool has actually returned an error.',
].join(' ');
