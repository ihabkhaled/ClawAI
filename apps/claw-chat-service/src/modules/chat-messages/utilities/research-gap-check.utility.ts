import {
  RESEARCH_GAP_CHECK_EVIDENCE_LABEL,
  RESEARCH_GAP_CHECK_MAX_QUERIES,
  RESEARCH_GAP_CHECK_QUERIES_LABEL,
  RESEARCH_GAP_CHECK_SUMMARY_MAX_CHARS,
  RESEARCH_GAP_CHECK_SYSTEM_PROMPT,
} from '../../../common/constants/research-gate.constants';
import {
  RESEARCH_GAP_CHECK_JSON_STRING,
  RESEARCH_GAP_CHECK_TRUNCATED_DONE,
  RESEARCH_GAP_CHECK_TRUNCATED_QUERIES,
} from '../constants/research-gap-check.constants';
import {
  PLANNER_NARRATION_MAX_CHARS,
  PLANNER_QUERY_MAX_CHARS,
  PLANNER_THINKING_MAX_CHARS,
} from '../constants/research-plan.constants';
import type { ResearchGapCheck } from '../types/research-gate.types';
import type { ResearchRunResponse } from '../types/research.types';
import { buildCouncilPrompt, extractFirstJsonObject } from './harness-council.utility';
import { bundleOf, summariseEvidence } from './research-orchestration.utility';
import { researchQueryKey } from './research-request.utility';
import { sanitizeUntrustedText } from './untrusted-fence.utility';

function readDone(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === 'false' ? value === 'true' : null;
}

function readText(value: unknown, maxChars: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxChars) : '';
}

/** New queries only: trimmed, at least two characters, capped, de-duplicated by case and spacing, ≤ 4. */
function readQueries(value: unknown): string[] {
  const entries: unknown[] = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const queries: string[] = [];
  for (const entry of entries) {
    const query = typeof entry === 'string' ? entry.trim().slice(0, PLANNER_QUERY_MAX_CHARS) : '';
    const key = researchQueryKey(query);
    if (query.length >= 2 && !seen.has(key)) {
      seen.add(key);
      queries.push(query);
    }
  }
  return queries.slice(0, RESEARCH_GAP_CHECK_MAX_QUERIES);
}

function unescapeJsonString(literal: string): string | null {
  try {
    const value: unknown = JSON.parse(`"${literal}"`);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** What a reply cut off before its closing brace still says: done or not, and the queries it finished. */
function readTruncatedGapCheck(raw: string): Record<string, unknown> | null {
  const done = RESEARCH_GAP_CHECK_TRUNCATED_DONE.exec(raw)?.[1];
  if (done === undefined) {
    return null;
  }
  const start = RESEARCH_GAP_CHECK_TRUNCATED_QUERIES.exec(raw);
  const tail = start === null ? '' : raw.slice(start.index + start[0].length);
  const end = tail.indexOf(']');
  const queries = [
    ...(end < 0 ? tail : tail.slice(0, end)).matchAll(RESEARCH_GAP_CHECK_JSON_STRING),
  ]
    .map((match) => unescapeJsonString(match[1] ?? ''))
    .filter((query): query is string => query !== null);
  return { done: done === 'true', queries };
}

function readGapObject(raw: string): Record<string, unknown> | null {
  const json = extractFirstJsonObject(raw);
  if (json !== null) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to the truncated reading
    }
  }
  return readTruncatedGapCheck(raw);
}

/**
 * Reads a gap-check reply (research engine B2): a JSON object, also inside a code fence or with prose around it, or
 * cut off mid-object (what it finished saying still counts). Null when it says nothing usable about `done`, so the
 * next configured model is asked (rule 50 §4); the gate answers "done" only when no model gave a usable reply. A
 * "not done" with no usable query is returned as is: the round loop stops on "no new queries".
 */
export function parseResearchGapCheck(raw: string): ResearchGapCheck | null {
  const object = readGapObject(raw);
  const done = object === null ? null : readDone(object.done);
  if (object === null || done === null) {
    return null;
  }
  return {
    done,
    queries: done ? [] : readQueries(object.queries),
    narration: readText(object.narration, PLANNER_NARRATION_MAX_CHARS),
    thinking: readText(object.thinking, PLANNER_THINKING_MAX_CHARS),
  };
}

/** The evidence a gap check reads: every page fenced as untrusted web data, openings only, capped. */
export function summariseRunForGapCheck(run: ResearchRunResponse | null): string {
  const items = bundleOf(run)?.items ?? [];
  return items.length === 0
    ? 'No web evidence was gathered.'
    : summariseEvidence(items, RESEARCH_GAP_CHECK_SUMMARY_MAX_CHARS);
}

/**
 * The gap-check prompt: the fixed instructions, then the user's message, the queries already searched and the
 * evidence, each fenced as data. The queries come from models too, so they are sanitised like page text.
 */
export function buildGapCheckPrompt(
  message: string,
  evidenceSummary: string,
  queriesRun: readonly string[],
): string {
  const queries = queriesRun
    .map(
      (query) =>
        `- ${sanitizeUntrustedText(query, PLANNER_QUERY_MAX_CHARS).replaceAll(/\s+/gu, ' ')}`,
    )
    .join('\n');
  return [
    buildCouncilPrompt(RESEARCH_GAP_CHECK_SYSTEM_PROMPT, message),
    `${RESEARCH_GAP_CHECK_QUERIES_LABEL}\n<<<\n${queries.length > 0 ? queries : '(none)'}\n>>>`,
    `${RESEARCH_GAP_CHECK_EVIDENCE_LABEL}\n${evidenceSummary}`,
  ].join('\n\n');
}
