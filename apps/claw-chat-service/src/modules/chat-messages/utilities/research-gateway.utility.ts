// THE research gateway (ADR-212, rules 50 and 59).
//
// Every chat surface that needs the web goes through this file and nowhere else:
// normal chat, AUTO and explicit modes, labs/gateway context, Compare and every
// orchestration manager (via the enricher), search-first and the model-callable
// web_search / web_fetch tools. It owns four things the five private copies each
// got differently:
//
//   1. the call            one place that talks to research-service
//   2. the timeouts        ONE set, each strictly larger than research-service's
//                          own bound for that phase (common/constants), so a slow
//                          provider's results are never cut off here first
//   3. the error mapping   timeout / HTTP / exception / unavailable, once
//   4. the provider facts  `providers[]` and `mode`, tolerated when absent
//
// Waiting is the point: callers await these functions, and only then start the
// answering model. A failure never throws; it returns `ok: false` with a failure
// kind, so the caller answers with whatever came back and says so.

import { Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  RESEARCH_GATEWAY_FETCH_TIMEOUT_MS,
  RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS,
} from '../../../common/constants/research-client.constants';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import { fetchPageViaResearch, httpRequest, runResearch } from '../../../common/utilities';
import {
  RESEARCH_GATEWAY_FETCH_CONCURRENCY,
  RESEARCH_GATEWAY_MAX_NARRATED_PROVIDERS,
  RESEARCH_GATEWAY_NO_PROVIDER_PATTERN,
} from '../constants/research-gateway.constants';
import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import type {
  ResearchFetchWireResponse,
  ResearchSearchWireResponse,
} from '../types/research-enricher.types';
import type {
  ResearchGatewayInternalSearchInput,
  ResearchGatewayPage,
  ResearchGatewayProvider,
  ResearchGatewaySearchOutcome,
  ResearchGatewayUserSearchInput,
} from '../types/research-gateway.types';
import type {
  ResearchEvidenceBundle,
  ResearchRequest,
  ResearchRunResponse,
  ResearchToolFetchOutcome,
} from '../types/research.types';
import { mapWithConcurrency } from './bounded-parallel.utility';
import { bundleOf } from './research-orchestration.utility';

const logger = new Logger('ResearchGateway');

const FAILED_PROVIDER_STATUSES: ReadonlySet<string> = new Set([
  'FAILED',
  'TIMEOUT',
  'ERROR',
  'SKIPPED',
]);

/** Maps a thrown error to a failure kind. An aborted fetch is a deadline; nothing else aborts these calls. */
export function mapResearchGatewayFailure(error: unknown): ResearchGatewayFailure {
  const isDeadline =
    error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
  return isDeadline ? ResearchGatewayFailure.TIMEOUT : ResearchGatewayFailure.EXCEPTION;
}

function emptySearchOutcome(
  failure: ResearchGatewayFailure,
  status?: number,
): ResearchGatewaySearchOutcome {
  return {
    ok: false,
    failure,
    ...(status === undefined ? {} : { status }),
    entries: [],
    requestCount: 1,
    providers: [],
    warnings: [],
  };
}

/**
 * Reads `providers[]` from the wire. Tolerates its absence (an older
 * research-service: returns []) and any field being missing: a provider is `ok`
 * unless it says otherwise. Reads names, status and counts only (no URL, no error body).
 */
export function parseGatewayProviders(raw: unknown): ResearchGatewayProvider[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const parsed: ResearchGatewayProvider[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item === 'string' && item.length > 0) {
      parsed.push({ name: item, ok: true });
      continue;
    }
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const entry = item as Record<string, unknown>;
    const name = [entry.name, entry.providerName, entry.kind, entry.providerKind, entry.id].find(
      (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
    );
    if (name === undefined) {
      continue;
    }
    const status = typeof entry.status === 'string' ? entry.status.toUpperCase() : undefined;
    parsed.push({
      name,
      ok: status === undefined ? entry.ok !== false : !FAILED_PROVIDER_STATUSES.has(status),
      ...(typeof entry.id === 'string' ? { id: entry.id } : {}),
      ...(typeof entry.resultCount === 'number' ? { resultCount: entry.resultCount } : {}),
    });
  }
  return parsed;
}

/** The providers a finished run reports: `providers[]` when present, else the ones it attempted. */
export function providersOfBundle(bundle: ResearchEvidenceBundle): ResearchGatewayProvider[] {
  const reported = parseGatewayProviders((bundle as unknown as { providers?: unknown }).providers);
  return reported.length > 0
    ? reported
    : parseGatewayProviders(bundle.providerSelection?.attemptedProviders);
}

/** The provider names worth narrating, capped; the rest are left to the count. */
export function describeGatewayProviders(providers: readonly ResearchGatewayProvider[]): string[] {
  return providers.slice(0, RESEARCH_GATEWAY_MAX_NARRATED_PROVIDERS).map(({ name }) => name);
}

function searchOutcomeFromWire(
  data: ResearchSearchWireResponse,
  maxResults: number,
): ResearchGatewaySearchOutcome {
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    ok: true,
    entries: results.slice(0, maxResults),
    // research-service's own unit count (N providers => N units). Chat never
    // multiplies or re-derives it: one search is recorded exactly once.
    requestCount:
      typeof data.searchRequestCount === 'number'
        ? Math.max(1, Math.floor(data.searchRequestCount))
        : 1,
    runId: data.runId ?? null,
    // What ANSWERED, which is not always what was asked for.
    ...(data.providerId === undefined ? {} : { providerId: data.providerId }),
    ...(data.providerName === undefined ? {} : { providerName: data.providerName }),
    ...(data.fallbackUsed === undefined ? {} : { fallbackUsed: data.fallbackUsed }),
    providers: parseGatewayProviders(data.providers),
    ...(typeof data.mode === 'string' ? { mode: data.mode } : {}),
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}

function providerSummary(outcome: ResearchGatewaySearchOutcome): string {
  return outcome.providers.map((p) => `${p.name}:${p.ok ? 'ok' : 'failed'}`).join(',');
}

/**
 * Search through the USER route (the caller's bearer token). ONE call; research-service
 * runs every enabled provider in parallel on AUTO and answers when all have settled or hit
 * its own bound, so waiting `RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS` loses nothing.
 */
export async function gatewaySearch(
  input: ResearchGatewayUserSearchInput,
): Promise<ResearchGatewaySearchOutcome> {
  const startedAt = Date.now();
  logger.log(
    `search: start route=user maxResults=${String(input.maxResults)} explicitProvider=${String(input.providerId !== undefined)}`,
  );
  try {
    const response = await httpRequest<ResearchSearchWireResponse>({
      url: `${AppConfig.get().RESEARCH_SERVICE_URL}/api/v1/research/search`,
      method: 'POST',
      headers: { Authorization: input.authorization },
      // `providerId` is the user's explicit choice; absent means AUTO (every provider).
      body: {
        query: input.query,
        maxResults: input.maxResults,
        ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
      },
      timeoutMs: RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS,
    });
    if (!response.ok) {
      logger.warn(`search: research-service status=${String(response.status)}`);
      return emptySearchOutcome(ResearchGatewayFailure.HTTP_ERROR, response.status);
    }
    const outcome = searchOutcomeFromWire(response.data, input.maxResults);
    logger.log(
      `search: all providers settled in ${String(Date.now() - startedAt)}ms providers=[${providerSummary(outcome)}] mode=${outcome.mode ?? 'n/a'} results=${String(outcome.entries.length)}`,
    );
    return outcome;
  } catch (error: unknown) {
    const failure = mapResearchGatewayFailure(error);
    logger.warn(
      `search: ${failure} after ${String(Date.now() - startedAt)}ms - ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return emptySearchOutcome(failure);
  }
}

/** `runResearch` already answers null on failure; this keeps the gateway's "never throws" promise whatever happens under it. */
async function runSafely(request: ResearchRequest): Promise<ResearchRunResponse | null> {
  try {
    return await runResearch(AppConfig.get().RESEARCH_SERVICE_URL, request);
  } catch (error: unknown) {
    logger.warn(
      `run: ${mapResearchGatewayFailure(error)} - ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return null;
  }
}

/**
 * Search through the SERVICE-TOKEN route, naming the user. For callers that hold no bearer
 * token (search-first, the model-callable web_search tool). Same providers, same timeouts;
 * the plan gate is the caller's (rule 50 item 6).
 */
export async function gatewaySearchForUser(
  input: ResearchGatewayInternalSearchInput,
): Promise<ResearchGatewaySearchOutcome> {
  const startedAt = Date.now();
  logger.log(
    `search: start route=internal maxResults=${String(input.maxResults)} explicitProvider=${String(input.providerId !== undefined)}`,
  );
  const run = await runSafely({
    userToken: '',
    userId: input.userId,
    intent: input.query,
    workflow: ResearchWorkflow.SEARCH_ONLY,
    searchProviderId: input.providerId,
    maxResults: input.maxResults,
    searchQuery: input.query,
    timeoutMs: RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS,
  });
  const bundle = bundleOf(run);
  if (run === null || bundle === null) {
    return emptySearchOutcome(ResearchGatewayFailure.UNAVAILABLE);
  }
  const wire = bundle as unknown as { providers?: unknown; mode?: unknown };
  const reported = parseGatewayProviders(wire.providers);
  const selection = bundle.providerSelection;
  const outcome: ResearchGatewaySearchOutcome = {
    ok: true,
    entries: bundle.items.slice(0, input.maxResults).map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      publishedAt: item.publishedAt,
      providerKind: item.providerKind,
    })),
    requestCount: 1,
    runId: run.id,
    ...(selection.providerId === null ? {} : { providerId: selection.providerId }),
    ...(selection.providerName === null ? {} : { providerName: selection.providerName }),
    fallbackUsed: selection.fallbackUsed,
    // Old shape: the bundle only names the providers it attempted.
    providers: reported.length > 0 ? reported : parseGatewayProviders(selection.attemptedProviders),
    ...(typeof wire.mode === 'string' ? { mode: wire.mode } : {}),
    warnings: bundle.warnings,
  };
  logger.log(
    `search: all providers settled in ${String(Date.now() - startedAt)}ms route=internal providers=[${providerSummary(outcome)}] results=${String(outcome.entries.length)}`,
  );
  return outcome;
}

/** True when research-service says it had no search provider to run (hosted search may then stand in). */
export function isNoProviderConfigured(outcome: ResearchGatewaySearchOutcome): boolean {
  return (
    outcome.ok &&
    outcome.entries.length === 0 &&
    outcome.warnings.some((warning) =>
      RESEARCH_GATEWAY_NO_PROVIDER_PATTERN.test(warning.replaceAll(/\s+/gu, ' ')),
    )
  );
}

/** One page through the user route. Never throws. */
export async function gatewayFetchPage(
  authorization: string,
  url: string,
  timeoutMs: number = RESEARCH_GATEWAY_FETCH_TIMEOUT_MS,
): Promise<ResearchGatewayPage> {
  try {
    const response = await httpRequest<ResearchFetchWireResponse>({
      url: `${AppConfig.get().RESEARCH_SERVICE_URL}/api/v1/research/fetch`,
      method: 'POST',
      headers: { Authorization: authorization },
      body: { url },
      timeoutMs,
    });
    if (!response.ok) {
      logger.warn(`fetch: status=${String(response.status)} url=${url}`);
      return {
        url,
        ok: false,
        failure: ResearchGatewayFailure.HTTP_ERROR,
        status: response.status,
        content: '',
      };
    }
    const content = (response.data.content ?? '').trim();
    return { url, ok: content.length > 0, title: response.data.title ?? null, content };
  } catch (error: unknown) {
    const failure = mapResearchGatewayFailure(error);
    logger.warn(
      `fetch: ${failure} url=${url} - ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return { url, ok: false, failure, content: '' };
  }
}

/**
 * A fetch BATCH: the pages run in parallel (bounded) and share ONE phase deadline, so N
 * slow pages cost one fetch budget, not N. A page that had not started when the deadline
 * passed is reported as a timeout. Results come back in input order.
 */
export async function gatewayFetchPages(
  authorization: string,
  urls: readonly string[],
  onFetching?: (url: string) => void,
): Promise<ResearchGatewayPage[]> {
  const startedAt = Date.now();
  logger.log(`fetch: batch start pages=${String(urls.length)}`);
  const pages = await mapWithConcurrency(
    urls,
    RESEARCH_GATEWAY_FETCH_CONCURRENCY,
    async (url): Promise<ResearchGatewayPage> => {
      const remaining = RESEARCH_GATEWAY_FETCH_TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        return { url, ok: false, failure: ResearchGatewayFailure.TIMEOUT, content: '' };
      }
      onFetching?.(url);
      return gatewayFetchPage(authorization, url, remaining);
    },
  );
  logger.log(
    `fetch: batch done in ${String(Date.now() - startedAt)}ms read=${String(pages.filter((page) => page.ok).length)}/${String(urls.length)}`,
  );
  return pages;
}

/**
 * A whole research run (planner-chosen or mode-chosen workflow) on the service-token route.
 * The default timeout is search + fetch (common constants); a crawl keeps its own.
 */
export async function gatewayRun(request: ResearchRequest): Promise<ResearchRunResponse | null> {
  const startedAt = Date.now();
  logger.log(`run: start workflow=${request.workflow}`);
  const run = await runSafely(request);
  logger.log(
    `run: ${run === null ? 'no answer' : `settled status=${run.status}`} workflow=${request.workflow} in ${String(Date.now() - startedAt)}ms`,
  );
  return run;
}

/** One page for the `web_fetch` tool (robots, SSRF and the escalation tiers apply, ADR-121). */
export async function gatewayToolFetch(
  request: { userId: string; url: string; timeoutMs?: number },
  baseUrl: string = AppConfig.get().RESEARCH_SERVICE_URL,
): Promise<ResearchToolFetchOutcome> {
  return fetchPageViaResearch(baseUrl, request);
}
