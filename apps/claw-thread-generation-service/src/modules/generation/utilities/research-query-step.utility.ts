import {
  RESEARCH_QUERY_CODE,
  RESEARCH_QUERY_FAILED_CODE,
  RESEARCH_QUERY_LOG_CHARS,
  RESEARCH_QUERY_SPEND_CODE,
} from '../constants/research-queries.constants';
import type { ResearchQueryResult, ResearchStepBase } from '../types/research-queries.types';
import type { StepRecordInput } from '../types/step-recorder.types';
import { clampQuery } from './research-text.utility';

/**
 * The step-log entry of one research query: the query shortened to 80 characters (the recorder
 * also removes secrets and URL query strings) and how many results it returned. A failed or
 * skipped query is SKIPPED, never FAILED: the pass goes on without it.
 */
export function researchQueryStep(
  result: ResearchQueryResult,
  failed: boolean,
  base: ResearchStepBase,
): StepRecordInput {
  const excerpt = JSON.stringify({
    query: clampQuery(result.query, RESEARCH_QUERY_LOG_CHARS),
    results: result.itemCount,
  });
  if (result.skippedForSpend) {
    return { ...base, outcome: 'SKIPPED', code: RESEARCH_QUERY_SPEND_CODE, rawExcerpt: excerpt };
  }
  return failed
    ? { ...base, outcome: 'SKIPPED', code: RESEARCH_QUERY_FAILED_CODE, rawExcerpt: excerpt }
    : { ...base, outcome: 'SUCCEEDED', code: RESEARCH_QUERY_CODE, rawExcerpt: excerpt };
}
