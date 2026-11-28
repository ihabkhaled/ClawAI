import type { ResearchGapCheck } from '../types/research-gate.types';

/**
 * What a turn does when no gap-check model gave a usable answer: research stops with the evidence it has. Fails
 * closed like the post-crawl re-plan, because another round spends the user's search allowance (rule 50 §4: a bad
 * reply is never turned into an action).
 */
export const RESEARCH_GAP_CHECK_FAILED_CLOSED: ResearchGapCheck = {
  done: true,
  queries: [],
  narration: '',
  thinking: '',
};

/** A reply cut off before its closing brace still says done or not done… */
export const RESEARCH_GAP_CHECK_TRUNCATED_DONE = /"done"\s*:\s*"?(true|false)"?/u;
/** …and the queries it finished writing: the complete JSON strings between this and the next `]`. */
export const RESEARCH_GAP_CHECK_TRUNCATED_QUERIES = /"queries"\s*:\s*\[/u;
/** One complete JSON string literal (an unterminated one never matches). Used with `matchAll` only. */
export const RESEARCH_GAP_CHECK_JSON_STRING = /"((?:[^"\\]|\\.)*)"/gu;
