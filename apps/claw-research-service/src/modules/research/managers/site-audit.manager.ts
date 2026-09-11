import { Injectable } from '@nestjs/common';

import { NO_JS_LIMITATION } from '../../../common/constants/site-audit.constants';
import { FindingConfidence } from '../../../common/enums/finding-confidence.enum';
import {
  groupByNormalizedTitle,
  normalizeUrlForComparison,
  readMetadata,
} from '../utilities/site-audit.utility';
import type { HtmlMetadata } from '../../../common/types/html-extract.types';
import type { AuditFinding } from '../types/audit-finding.types';
import type { EvidenceItem } from '../types/evidence-bundle.types';

/**
 * Turns a completed crawl's evidence into findings ABOUT the site, rather
 * than leaving the caller to eyeball a list of pages. Pure and synchronous:
 * no network calls, only the metadata `SiteCrawlManager` already collected
 * per page (`EvidenceItem.structured.metadata`, an `HtmlMetadata` from
 * `extractHtml`).
 *
 * Every finding names the evidence items it was computed from
 * (`evidenceItemIds`) and a confidence that separates "directly observed in
 * fetched markup" from "computed with certainty from data already
 * collected" — see `FindingConfidence`'s own doc comment and rule 41 item
 * 13. This is intentionally a small, fixed set of checks: it is a starting
 * point for confidence-scored findings, not a general SEO rule engine.
 */
@Injectable()
export class SiteAuditManager {
  analyze(items: EvidenceItem[]): AuditFinding[] {
    const pages = items
      .map((item) => ({ item, metadata: readMetadata(item) }))
      .filter(
        (entry): entry is { item: EvidenceItem; metadata: HtmlMetadata } => entry.metadata !== null,
      );

    if (pages.length === 0) {
      return [];
    }

    const findings: AuditFinding[] = [];

    const missingDescription = pages.filter(({ metadata }) => metadata.description === null);
    if (missingDescription.length > 0) {
      findings.push({
        category: 'meta-description',
        claim: `${String(missingDescription.length)} of ${String(pages.length)} crawled page(s) have no <meta name="description"> in their fetched HTML.`,
        confidence: FindingConfidence.HIGH,
        evidenceItemIds: missingDescription.map(({ item }) => item.id),
        limitations: [NO_JS_LIMITATION],
      });
    }

    const missingCanonical = pages.filter(({ metadata }) => metadata.canonicalUrl === null);
    if (missingCanonical.length > 0) {
      findings.push({
        category: 'canonical-url',
        claim: `${String(missingCanonical.length)} of ${String(pages.length)} crawled page(s) have no <link rel="canonical"> in their fetched HTML.`,
        confidence: FindingConfidence.HIGH,
        evidenceItemIds: missingCanonical.map(({ item }) => item.id),
        limitations: [NO_JS_LIMITATION],
      });
    }

    const selfCanonicalMismatch = pages.filter(({ item, metadata }) => {
      if (metadata.canonicalUrl === null) {
        return false;
      }
      return (
        normalizeUrlForComparison(metadata.canonicalUrl) !== normalizeUrlForComparison(item.url)
      );
    });
    if (selfCanonicalMismatch.length > 0) {
      findings.push({
        category: 'canonical-mismatch',
        claim: `${String(selfCanonicalMismatch.length)} crawled page(s) declare a canonical URL that points somewhere other than the URL that was fetched.`,
        confidence: FindingConfidence.CONFIRMED,
        evidenceItemIds: selfCanonicalMismatch.map(({ item }) => item.id),
        limitations: [
          'A mismatch is not necessarily an error — pagination and tracking-parameter variants legitimately canonicalize elsewhere.',
        ],
      });
    }

    const duplicateTitleGroups = groupByNormalizedTitle(pages.map(({ item }) => item));
    if (duplicateTitleGroups.length > 0) {
      const affected = duplicateTitleGroups.flat();
      findings.push({
        category: 'duplicate-title',
        claim: `${String(affected.length)} crawled page(s) share an identical <title> with at least one other crawled page (${String(duplicateTitleGroups.length)} distinct title(s) repeated).`,
        confidence: FindingConfidence.CONFIRMED,
        evidenceItemIds: affected.map((item) => item.id),
        limitations: [],
      });
    }

    return findings;
  }
}
