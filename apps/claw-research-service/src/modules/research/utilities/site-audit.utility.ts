import type { HtmlMetadata } from '../../../common/types/html-extract.types';
import type { EvidenceItem } from '../types/evidence-bundle.types';

export function readMetadata(item: EvidenceItem): HtmlMetadata | null {
  const structured = item.structured;
  if (structured === undefined) {
    return null;
  }
  const metadata = structured.metadata;
  return isHtmlMetadataShape(metadata) ? metadata : null;
}

function isHtmlMetadataShape(value: unknown): value is HtmlMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'canonicalUrl' in value &&
    'description' in value &&
    'hreflangAlternates' in value &&
    'feedUrls' in value
  );
}

export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.href.replace(/\/$/u, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Groups items whose (trimmed, case-folded) title is shared by more than one. */
export function groupByNormalizedTitle(items: EvidenceItem[]): EvidenceItem[][] {
  const byTitle = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    const title = item.title?.trim().toLowerCase();
    if (title === undefined || title.length === 0) {
      continue;
    }
    const group = byTitle.get(title) ?? [];
    group.push(item);
    byTitle.set(title, group);
  }
  return [...byTitle.values()].filter((group) => group.length > 1);
}
