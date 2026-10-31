import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { runWithConcurrencyLimit } from '../../../common/utilities/concurrency-pool.utility';
import {
  isCloudMetadataHost,
  isPrivateOrLoopbackHost,
} from '../../../common/utilities/url-safety.utility';
import { stripWww } from './crawl-ranking.utility';
import type {
  FetchBatchOptions,
  FetchBatchOutcome,
  FetchBatchStatus,
} from '../types/fetch-batch.types';

/** Lane key: the site (host without `www.`); an unparsable URL is its own lane. */
export function hostLaneKey(url: string): string {
  try {
    return stripWww(new URL(url).hostname);
  } catch {
    return `invalid:${url}`;
  }
}

/**
 * The fetch layer refuses a private or metadata address by failing every tier,
 * which surfaces as a plain FETCH_FAILED. A literal non-public host that failed
 * is reported as the SSRF refusal it was.
 */
export function isNonPublicTarget(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return isCloudMetadataHost(host) || isPrivateOrLoopbackHost(host);
  } catch {
    return false;
  }
}

/** Maps a caught fetch error to the status reported for that URL. */
export function classifyFetchError(error: unknown): FetchBatchStatus {
  if (!(error instanceof BusinessException)) {
    return 'FAILED';
  }
  switch (error.code) {
    case ResearchErrorCode.UNSAFE_URL:
    case ResearchErrorCode.FETCH_URL_BLOCKED:
      return 'BLOCKED_SSRF';
    case ResearchErrorCode.FETCH_ROBOTS_DISALLOWED:
      return 'BLOCKED_ROBOTS';
    case ResearchErrorCode.FETCH_TIMEOUT:
      return 'TIMEOUT';
    default:
      return 'FAILED';
  }
}

/**
 * Runs `worker` over `items` in parallel batches (ADR-211):
 *
 * - items are grouped by host; a host's items run one after another in input
 *   order (politeness), different hosts run side by side, at most
 *   `concurrency` lanes at once;
 * - one failing item never fails the batch: it becomes a non-OK outcome;
 * - after `deadlineMs` no new item starts, finished items keep their result
 *   and every unfinished item is reported TIMEOUT (a late result is ignored);
 * - outcomes come back in INPUT order, whatever order they completed in.
 *
 * Callers pass a short, already-capped list (at most a dozen URLs), so there is
 * no unbounded `Promise.all`; memory is bounded by the list and the 2 MB body cap.
 */
export async function runFetchBatch<T, R>(
  items: readonly T[],
  options: FetchBatchOptions<T, R>,
): Promise<Array<FetchBatchOutcome<R>>> {
  const now = options.now ?? Date.now;
  const outcomes = new Map<number, FetchBatchOutcome<R>>();
  const started = new Map<number, number>();
  let closed = false;

  const lanes = groupIntoLanes(items, options.urlOf);
  const runLane = async (lane: readonly number[]): Promise<void> => {
    for (const index of lane) {
      const item = items.at(index);
      if (closed || item === undefined) {
        return;
      }
      const startedAt = now();
      started.set(index, startedAt);
      const outcome = await runOne(item, index, options, startedAt, now);
      if (closed) {
        return;
      }
      outcomes.set(index, outcome);
    }
  };

  const pool = runWithConcurrencyLimit(lanes, options.concurrency, runLane);
  await raceWithDeadline(pool, options.deadlineMs);
  closed = true;

  return items.map(
    (item, index) =>
      outcomes.get(index) ?? {
        index,
        url: options.urlOf(item),
        status: 'TIMEOUT',
        error: 'Did not finish inside the time limit for fetching pages.',
        startedAt: started.get(index) ?? null,
        endedAt: null,
      },
  );
}

async function runOne<T, R>(
  item: T,
  index: number,
  options: FetchBatchOptions<T, R>,
  startedAt: number,
  now: () => number,
): Promise<FetchBatchOutcome<R>> {
  const url = options.urlOf(item);
  try {
    const value = await options.worker(item, index);
    return { index, url, status: 'OK', value, startedAt, endedAt: now() };
  } catch (error) {
    const status = classifyFetchError(error);
    return {
      index,
      url,
      status: status === 'FAILED' && isNonPublicTarget(url) ? 'BLOCKED_SSRF' : status,
      error: describeFetchFailure(error),
      startedAt,
      endedAt: now(),
    };
  }
}

function groupIntoLanes<T>(items: readonly T[], urlOf: (item: T) => string): number[][] {
  const lanes = new Map<string, number[]>();
  for (const [index, item] of items.entries()) {
    const key = hostLaneKey(urlOf(item));
    const lane = lanes.get(key);
    if (lane === undefined) {
      lanes.set(key, [index]);
    } else {
      lane.push(index);
    }
  }
  return [...lanes.values()];
}

async function raceWithDeadline(work: Promise<void>, deadlineMs: number | null): Promise<void> {
  if (deadlineMs === null) {
    await work;
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, deadlineMs);
  });
  try {
    await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
