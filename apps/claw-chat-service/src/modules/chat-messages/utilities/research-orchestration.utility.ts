import { RESEARCH_REPLAN_SUMMARY_MAX_CHARS } from '../../../common/constants/research-gate.constants';
import type { ResearchEvidenceBundle, ResearchRunResponse } from '../types/research.types';

/** The run's evidence bundle, or null when the run failed or came back empty-shaped. */
export function bundleOf(run: ResearchRunResponse | null): ResearchEvidenceBundle | null {
  if (run === null || !('items' in run.bundle) || !Array.isArray(run.bundle.items)) {
    return null;
  }
  return run.bundle as ResearchEvidenceBundle;
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
