import { RESEARCH_REPLAN_SUMMARY_MAX_CHARS } from '../../../common/constants/research-gate.constants';
import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import {
  NARRATION_MAX_PAGE_READ_LINES,
  NARRATION_UNREMARKABLE_STRATEGY,
} from '../constants/narration.constants';
import type { NarrationInput } from '../types/narration.types';
import type {
  ResearchEvidenceBundle,
  ResearchEvidenceItem,
  ResearchFetchProvenance,
  ResearchRunResponse,
} from '../types/research.types';

/** The run's evidence bundle, or null when the run failed or came back empty-shaped. */
export function bundleOf(run: ResearchRunResponse | null): ResearchEvidenceBundle | null {
  return run === null || !('items' in run.bundle) || !Array.isArray(run.bundle.items) ? null : (run.bundle as ResearchEvidenceBundle);
}

/** The distinct fetch strategies that served this evidence, in first-seen order. Reads untyped JSON defensively (stored metadata). */
export function fetchStrategiesOf(items: readonly unknown[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const strategy = provenanceOf(item)?.strategy;
    if (strategy !== undefined) {
      seen.add(strategy);
    }
  }
  return [...seen];
}

/**
 * One narration line per page an ESCALATED tier served (anything but a plain
 * GET that worked), capped. Truthful by construction: each line is built from
 * the measured provenance of that page; pages with none (search hits, cache
 * hits) say nothing. Host only, never a URL.
 */
export function pageReadNarrations(items: readonly ResearchEvidenceItem[]): NarrationInput[] {
  const lines: NarrationInput[] = [];
  for (const item of items) {
    const provenance = provenanceOf(item);
    if (provenance === undefined || provenance.strategy === NARRATION_UNREMARKABLE_STRATEGY) {
      continue;
    }
    const failed = provenance.attempts.find((attempt) => attempt.outcome !== 'SUCCESS');
    lines.push({
      kind: NarrationKind.PAGE_READ,
      params: {
        host: hostOf(item.url),
        strategy: provenance.strategy,
        blocked: failed?.kind ?? '',
      },
    });
    if (lines.length >= NARRATION_MAX_PAGE_READ_LINES) {
      break;
    }
  }
  return lines;
}

function provenanceOf(item: unknown): ResearchFetchProvenance | undefined {
  if (typeof item !== 'object' || item === null) {
    return undefined;
  }
  const fetch: unknown = (item as { fetch?: unknown }).fetch;
  if (typeof fetch !== 'object' || fetch === null) {
    return undefined;
  }
  const { strategy, attempts } = fetch as { strategy?: unknown; attempts?: unknown };
  if (typeof strategy !== 'string' || strategy.length === 0) {
    return undefined;
  }
  return {
    strategy,
    attempts: Array.isArray(attempts)
      ? attempts.filter(
          (a): a is { kind: string; outcome: string } =>
            typeof a === 'object' &&
            a !== null &&
            typeof (a as { kind?: unknown }).kind === 'string' &&
            typeof (a as { outcome?: unknown }).outcome === 'string',
        )
      : [],
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** What the planner is shown after a crawl: titles and the start of each page. */
export function summariseCrawl(run: ResearchRunResponse | null): string {
  const bundle = bundleOf(run);
  if (bundle === null || bundle.items.length === 0) {
    return 'Nothing could be read from the site.';
  }
  const perItem = Math.max(80, Math.floor(RESEARCH_REPLAN_SUMMARY_MAX_CHARS / bundle.items.length));
  return bundle.items
    .map((item) => `- ${item.title ?? item.url}: ${item.snippet.slice(0, perItem)}`)
    .join('\n');
}

/** One evidence bundle from a crawl and a search, crawl first (the user named it). */
export function mergeResearchRuns(
  crawled: ResearchRunResponse | null,
  searched: ResearchRunResponse | null,
): ResearchRunResponse | null {
  const first = bundleOf(crawled);
  const second = bundleOf(searched);
  if (crawled === null || first === null) {
    return searched;
  }
  if (second === null || searched === null) {
    return crawled;
  }
  return {
    ...crawled,
    workflow: `${crawled.workflow}+${searched.workflow}`,
    bundle: {
      ...first,
      items: [...first.items, ...second.items],
      warnings: [...first.warnings, ...second.warnings],
      toolsUsed: [...new Set([...first.toolsUsed, ...second.toolsUsed])],
      providerSelection: second.providerSelection,
    },
  };
}

/** Appends URLs the text does not already contain, so research-service crawls them too. */
export function appendMissingUrls(intent: string, urls: readonly string[]): string {
  const missing = urls.filter((url) => !intent.includes(url));
  return missing.length === 0 ? intent : `${intent}\n\n${missing.join('\n')}`;
}
