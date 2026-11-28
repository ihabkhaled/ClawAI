import { RESEARCH_DEPTH_BUDGETS } from '../../../common/constants/research-engine.constants';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { DepthBudget } from '../types/research-engine.types';

/** The budget row for a depth; null when depth is absent (today's behaviour) or out of the table. */
export function depthBudgetOf(depth: number | undefined): DepthBudget | null {
  const valid = depth !== undefined && Number.isInteger(depth) && depth >= 0;
  return valid ? (RESEARCH_DEPTH_BUDGETS.at(depth) ?? null) : null;
}

/**
 * True when the caller sent any research-engine field (B1+B2). Only then does a
 * run use the multi-query search, the Redis cache, thread memory, content-hash
 * dedupe and `bundle.stats`; a request with none of them runs today's pipeline.
 */
export function isEngineRequest(dto: ExecuteResearchDto): boolean {
  return (
    dto.threadId !== undefined ||
    dto.queries !== undefined ||
    dto.languages !== undefined ||
    dto.depth !== undefined ||
    dto.round !== undefined ||
    dto.excludeUrls !== undefined
  );
}
