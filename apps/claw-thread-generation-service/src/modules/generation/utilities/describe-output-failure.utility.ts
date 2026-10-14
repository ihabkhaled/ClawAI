import type { z } from 'zod';

import { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';
import { JSON_OPEN_BRACE, MODEL_JSON_MAX_OBJECT_STARTS } from '../constants/generation.constants';
import {
  OUTPUT_CUSTOM_ISSUE_TEXT,
  OUTPUT_FAILURE_REASONS,
  OUTPUT_HEAD_CHARS,
  OUTPUT_ISSUE_PATHS_MAX,
  OUTPUT_ROOT_PATH,
  OUTPUT_TAIL_CHARS,
} from '../constants/output-failure.constants';
import { findObjectEnd, parseModelJson } from './parse-model-json.utility';
import { stripReasoningBlocks } from './strip-reasoning-blocks.utility';

/** True when every `{` in the text closes (so the JSON is malformed, not cut off). */
function hasOnlyClosedObjects(text: string): boolean {
  let from = 0;
  for (let starts = 0; starts < MODEL_JSON_MAX_OBJECT_STARTS; starts += 1) {
    const start = text.indexOf(JSON_OPEN_BRACE, from);
    if (start === -1) return true;
    if (findObjectEnd(text, start) === -1) return false;
    from = start + 1;
  }
  return true;
}

/** Which kind of failure a reply is, decided from its text and the schema that rejected it. */
export function classifyModelOutput(content: string, accepts: z.ZodType): ModelOutputFailureKind {
  const text = content.trim();
  if (text.length === 0) return ModelOutputFailureKind.EMPTY;
  if (parseModelJson(text, accepts) !== undefined) return ModelOutputFailureKind.WRONG_SHAPE;
  // Thinking that never ended means the output limit hit before any answer started.
  const { answer, unfinished } = stripReasoningBlocks(text);
  if (unfinished && !answer.includes(JSON_OPEN_BRACE)) return ModelOutputFailureKind.TRUNCATED;
  if (!answer.includes(JSON_OPEN_BRACE)) return ModelOutputFailureKind.PROSE;
  return hasOnlyClosedObjects(answer)
    ? ModelOutputFailureKind.INVALID_JSON
    : ModelOutputFailureKind.TRUNCATED;
}

function shapeDetail(content: string, accepts: z.ZodType): string {
  const candidate = parseModelJson(content.trim(), accepts);
  const result = accepts.safeParse(candidate);
  if (result.success) return '';
  const names = new Set<string>();
  for (const issue of result.error.issues) {
    names.add(
      issue.code === 'custom'
        ? OUTPUT_CUSTOM_ISSUE_TEXT
        : issue.path.map(String).join('.') || OUTPUT_ROOT_PATH,
    );
  }
  return ` Problem: ${[...names].slice(0, OUTPUT_ISSUE_PATHS_MAX).join(', ')}.`;
}

function flatten(text: string): string {
  return text.replaceAll(/\s+/gu, ' ').trim();
}

/**
 * The owner-visible reason a reply was refused: the classified cause first, then its length and a
 * short start and end of the reply, so a cut-off answer shows where it stopped instead of being
 * lost behind a blind cut at the excerpt limit. The recorder still redacts and bounds the result.
 */
export function describeOutputFailure(content: string, accepts: z.ZodType): string {
  const kind = classifyModelOutput(content, accepts);
  const reason = `${kind}: ${OUTPUT_FAILURE_REASONS.get(kind) ?? kind}.`;
  const detail = kind === ModelOutputFailureKind.WRONG_SHAPE ? shapeDetail(content, accepts) : '';
  const text = flatten(content);
  if (text.length === 0) return `${reason}${detail}`;
  const head = text.slice(0, OUTPUT_HEAD_CHARS);
  const tail =
    text.length > OUTPUT_HEAD_CHARS + OUTPUT_TAIL_CHARS ? text.slice(-OUTPUT_TAIL_CHARS) : '';
  const ending = tail ? ` End: "${tail}"` : '';
  return `${reason}${detail} ${String(content.length)} characters. Start: "${head}"${ending}`;
}
