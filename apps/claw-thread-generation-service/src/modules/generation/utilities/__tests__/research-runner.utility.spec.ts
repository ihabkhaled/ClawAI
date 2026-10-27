import { RESEARCH_QUERY_CONCURRENCY } from '../../constants/research-queries.constants';
import type { ResearchQueryResult, ResearchRunnerDeps } from '../../types/research-queries.types';
import { researchQueryStep } from '../research-query-step.utility';
import { runResearchQueries } from '../research-runner.utility';
import type { ResearchEvidence } from '../../../research/research.client';

const evidenceOf = (count: number): ResearchEvidence => ({
  researchRunId: 'r',
  bundle: {
    items: Array.from({ length: count }, (_, i) => ({ id: String(i), url: 'https://e.org' })),
  },
  sha256: 'x'.repeat(64),
  version: 1,
});

function deps(over: Partial<ResearchRunnerDeps> = {}): {
  deps: ResearchRunnerDeps;
  recorded: Array<{ result: ResearchQueryResult; failed: boolean }>;
} {
  const recorded: Array<{ result: ResearchQueryResult; failed: boolean }> = [];
  return {
    recorded,
    deps: {
      run: () => Promise.resolve(evidenceOf(2)),
      overBudget: () => Promise.resolve(false),
      throwIfCancelled: () => Promise.resolve(),
      record: (result, failed) => {
        recorded.push({ result, failed });
        return Promise.resolve();
      },
      ...over,
    },
  };
}

describe('running the queries of a research pass (ADR-195)', () => {
  it('keeps the order of the queries and records each one', async () => {
    const { deps: d, recorded } = deps({
      run: (intent) => Promise.resolve(evidenceOf(intent.length)),
    });

    const results = await runResearchQueries(['aa', 'b', 'cccc'], d);

    expect(results.map(({ query }) => query)).toEqual(['aa', 'b', 'cccc']);
    expect(results.map(({ itemCount }) => itemCount)).toEqual([2, 1, 4]);
    expect(recorded).toHaveLength(3);
  });

  it('never has more than four queries in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const release: Array<() => void> = [];
    const { deps: d } = deps({
      run: () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        return new Promise<ResearchEvidence>((resolve) => {
          release.push(() => {
            inFlight -= 1;
            resolve(evidenceOf(1));
          });
        });
      },
    });
    const queries = Array.from({ length: 6 }, (_, i) => `query ${String(i)}`);

    const pending = runResearchQueries(queries, d);
    await vi.waitFor(() => expect(release).toHaveLength(RESEARCH_QUERY_CONCURRENCY));
    expect(inFlight).toBe(RESEARCH_QUERY_CONCURRENCY);
    for (const done of release.splice(0)) done();
    await vi.waitFor(() => expect(release).toHaveLength(2));
    for (const done of release.splice(0)) done();
    const results = await pending;

    expect(peak).toBe(RESEARCH_QUERY_CONCURRENCY);
    expect(results).toHaveLength(6);
  });

  it('a failing query loses only itself and keeps the first error', async () => {
    const boom = new Error('Research service is unavailable');
    const { deps: d, recorded } = deps({
      run: (intent) => (intent === 'bad' ? Promise.reject(boom) : Promise.resolve(evidenceOf(3))),
    });

    const results = await runResearchQueries(['good', 'bad', 'fine'], d);

    expect(results.map(({ evidence }) => evidence !== null)).toEqual([true, false, true]);
    expect(results[1]?.error).toBe(boom);
    expect(recorded.filter(({ failed }) => failed)).toHaveLength(1);
  });

  it('skips a query once the job is over its spend ceiling, without calling research', async () => {
    const run = vi.fn().mockResolvedValue(evidenceOf(1));
    let calls = 0;
    const { deps: d, recorded } = deps({
      run,
      // The first query is allowed, every later one is past the ceiling.
      overBudget: () => {
        calls += 1;
        return Promise.resolve(calls > 1);
      },
    });

    const results = await runResearchQueries(['one', 'two', 'three'], d, 1);

    expect(run).toHaveBeenCalledTimes(1);
    expect(results.map(({ skippedForSpend }) => skippedForSpend)).toEqual([false, true, true]);
    expect(recorded.filter(({ result }) => result.skippedForSpend)).toHaveLength(2);
  });

  it('stops the whole pass when the job is cancelled', async () => {
    const cancelled = new Error('cancelled');
    const { deps: d } = deps({
      run: () => Promise.reject(new Error('aborted call')),
      throwIfCancelled: () => Promise.reject(cancelled),
    });

    await expect(runResearchQueries(['a', 'b'], d)).rejects.toBe(cancelled);
  });

  it('runs nothing for no queries', async () => {
    const { deps: d } = deps();

    expect(await runResearchQueries([], d)).toEqual([]);
  });
});

describe('the step of one query (ADR-195)', () => {
  const base = { stage: 'RESEARCH' as never, roleKind: 'RESEARCH' as const };
  const result = (over: Partial<ResearchQueryResult> = {}): ResearchQueryResult => ({
    query: 'q'.repeat(200),
    evidence: evidenceOf(4),
    itemCount: 4,
    skippedForSpend: false,
    ...over,
  });

  it('logs the query cut to 80 characters and how many results it returned', () => {
    const step = researchQueryStep(result(), false, base);

    expect(step).toMatchObject({ outcome: 'SUCCEEDED', code: 'RESEARCH_QUERY' });
    const record = JSON.parse(String(step.rawExcerpt)) as { query: string; results: number };
    expect([...record.query].length).toBeLessThanOrEqual(80);
    expect(record.results).toBe(4);
  });

  it('is SKIPPED, never FAILED, for a failed query and for a spend skip', () => {
    expect(researchQueryStep(result({ evidence: null, itemCount: 0 }), true, base)).toMatchObject({
      outcome: 'SKIPPED',
      code: 'RESEARCH_QUERY_FAILED',
    });
    expect(researchQueryStep(result({ skippedForSpend: true }), false, base)).toMatchObject({
      outcome: 'SKIPPED',
      code: 'RESEARCH_QUERY_SPEND_CAP',
    });
  });

  it('leaves no secret or url query string in the logged text', () => {
    const step = researchQueryStep(
      result({
        query: 'see https://example.org/x?token=abc sk-abcdefghijklmnopqrstuvwxyz0123456789',
      }),
      false,
      base,
    );

    expect(String(step.rawExcerpt)).not.toContain('token=abc');
    expect(String(step.rawExcerpt)).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
  });
});
