import { RESEARCH_QUERY_CONCURRENCY } from '../constants/research-queries.constants';
import type { ResearchQueryResult, ResearchRunnerDeps } from '../types/research-queries.types';

function countItems(bundle: Record<string, unknown>): number {
  const items = bundle['items'];
  return Array.isArray(items) ? items.length : 0;
}

async function runOne(query: string, deps: ResearchRunnerDeps): Promise<ResearchQueryResult> {
  if (await deps.overBudget()) {
    const skipped = { query, evidence: null, itemCount: 0, skippedForSpend: true };
    await deps.record(skipped, false);
    return skipped;
  }
  try {
    const evidence = await deps.run(query);
    const result = {
      query,
      evidence,
      itemCount: countItems(evidence.bundle),
      skippedForSpend: false,
    };
    await deps.record(result, false);
    return result;
  } catch (error: unknown) {
    // A cancelled or timed-out job stops the whole pass; any other failure only loses this query.
    await deps.throwIfCancelled();
    const failed = { query, evidence: null, itemCount: 0, skippedForSpend: false, error };
    await deps.record(failed, true);
    return failed;
  }
}

/**
 * Runs the queries with at most four in flight, in query order. A query that fails or is skipped
 * for the spend ceiling does not stop the others; the results keep the order of the queries.
 */
export async function runResearchQueries(
  queries: readonly string[],
  deps: ResearchRunnerDeps,
  concurrency: number = RESEARCH_QUERY_CONCURRENCY,
): Promise<ResearchQueryResult[]> {
  const results = new Map<number, ResearchQueryResult>();
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      const query = queries.at(index);
      if (query === undefined) return;
      await deps.throwIfCancelled();
      results.set(index, await runOne(query, deps));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));
  return queries.flatMap((_query, index) => {
    const result = results.get(index);
    return result ? [result] : [];
  });
}
