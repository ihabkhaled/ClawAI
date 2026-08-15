import { recordGet } from '../../../../common/utilities';
import {
  ROUTING_LAB_ALL_ROUTER_ERROR_CODES,
  ROUTING_LAB_MANIFEST_SCOPE_NOTE,
  ROUTING_LAB_MANIFEST_TITLE,
  ROUTING_LAB_MANIFEST_WHAT_THIS_DOES_NOT_PROVE,
  ROUTING_LAB_MANIFEST_WHAT_THIS_PROVES,
} from '../constants/routing-lab-manifest.constants';
import type {
  RoutingLabErrorTaxonomyBreakdown,
  RoutingLabFallbackDepthBreakdown,
  RoutingLabManifestData,
  RoutingLabPassDeclineBreakdown,
} from '../types/routing-lab-manifest.types';

function renderCategoryTable(data: RoutingLabManifestData): string {
  const rows = Object.entries(data.categoryCounts)
    .map(([category, count]) => `| ${category} | ${String(count)} |`)
    .join('\n');
  return `| Category | Cases |\n| --- | --- |\n${rows}`;
}

function readErrorCodeCount(
  counts: Readonly<Partial<Record<string, number>>>,
  code: string,
): number {
  return recordGet(counts, code) ?? 0;
}

function renderPassDeclineTable(data: RoutingLabManifestData): string {
  const { passDecline }: { passDecline: RoutingLabPassDeclineBreakdown } = data;
  const reasonRows = Object.entries(passDecline.declinedByReason)
    .map(([reason, count]) => `| ${reason} | ${String(count)} |`)
    .join('\n');
  const finalCodeRows = ROUTING_LAB_ALL_ROUTER_ERROR_CODES.map((code) => {
    const count = readErrorCodeCount(passDecline.declinedByFinalErrorCode, code);
    return `| ${code} | ${String(count)} |`;
  }).join('\n');

  return (
    `| Outcome | Cases |\n| --- | --- |\n` +
    `| Passed | ${String(passDecline.passed)} |\n` +
    `| Declined — unavailable (config/eligibility) | ${String(passDecline.declinedUnavailable)} |\n` +
    `| Declined — chain exhausted | ${String(passDecline.declinedChainExhausted)} |\n\n` +
    `**Unavailable declines by reason:**\n\n| Reason | Cases |\n| --- | --- |\n${reasonRows}\n\n` +
    `**Chain-exhausted declines by final error code:**\n\n| Code | Cases |\n| --- | --- |\n${finalCodeRows}`
  );
}

function renderFallbackDepthTable(data: RoutingLabManifestData): string {
  const { fallbackDepth }: { fallbackDepth: RoutingLabFallbackDepthBreakdown } = data;
  const histogramByKey = fallbackDepth.histogram as Readonly<Record<string, number>>;
  const depths = Object.keys(fallbackDepth.histogram)
    .map(Number)
    .sort((left, right) => left - right);
  const rows = depths
    .map(
      (depth) => `| ${String(depth)} | ${String(recordGet(histogramByKey, String(depth)) ?? 0)} |`,
    )
    .join('\n');

  return (
    `| Fallback depth | Successes |\n| --- | --- |\n${rows}\n\n` +
    `Successful decisions: ${String(fallbackDepth.successCount)} · ` +
    `average depth: ${fallbackDepth.averageDepth.toFixed(2)} · ` +
    `max depth: ${String(fallbackDepth.maxDepth)}`
  );
}

function renderErrorTaxonomyTable(data: RoutingLabManifestData): string {
  const { errorTaxonomy }: { errorTaxonomy: RoutingLabErrorTaxonomyBreakdown } = data;
  const rows = ROUTING_LAB_ALL_ROUTER_ERROR_CODES.map((code) => {
    const count = readErrorCodeCount(errorTaxonomy.counts, code);
    const observed = count > 0 ? 'yes' : 'no';
    return `| ${code} | ${String(count)} | ${observed} |`;
  }).join('\n');

  return (
    `| RouterErrorCode | Attempts | Observed |\n| --- | --- | --- |\n${rows}\n\n` +
    `Total attempts: ${String(errorTaxonomy.totalAttempts)} · ` +
    `failed attempts: ${String(errorTaxonomy.totalFailedAttempts)} · ` +
    `distinct codes observed: ${String(errorTaxonomy.distinctCodesObserved)} / ${String(ROUTING_LAB_ALL_ROUTER_ERROR_CODES.length)}`
  );
}

function renderList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Renders one `RoutingLabManifestData` into the markdown artifact — the
 * batch's evidence output. Pure and deterministic given its input, so a
 * unit test can assert on the string without running the full corpus.
 */
export function renderRoutingLabManifest(data: RoutingLabManifestData): string {
  return (
    `# ${ROUTING_LAB_MANIFEST_TITLE}\n\n` +
    `Generated: ${data.generatedAt}\n\n` +
    `Corpus size: ${String(data.totalCases)} cases.\n\n` +
    `> **Scope note.** ${ROUTING_LAB_MANIFEST_SCOPE_NOTE}\n\n` +
    `## 1. Category breakdown\n\n${renderCategoryTable(data)}\n\n` +
    `## 2. Pass / decline breakdown\n\n${renderPassDeclineTable(data)}\n\n` +
    `## 3. Fallback-depth distribution\n\n${renderFallbackDepthTable(data)}\n\n` +
    `## 4. Error-taxonomy distribution\n\n${renderErrorTaxonomyTable(data)}\n\n` +
    `## What this proves\n\n${renderList(ROUTING_LAB_MANIFEST_WHAT_THIS_PROVES)}\n\n` +
    `## What this does not prove\n\n${renderList(ROUTING_LAB_MANIFEST_WHAT_THIS_DOES_NOT_PROVE)}\n`
  );
}
