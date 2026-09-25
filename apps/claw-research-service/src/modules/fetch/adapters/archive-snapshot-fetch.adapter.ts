import { Injectable } from '@nestjs/common';

import { assertSafeRequestUrl } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_LINKS,
  FETCH_MAX_REDIRECTS,
  RESEARCH_BOT_USER_AGENT,
} from '../../../common/constants/fetch.constants';
import { FetchStrategyKind } from '../../../generated/prisma';
import {
  ARCHIVE_SNAPSHOT_AVAILABILITY_URL,
  ARCHIVE_SNAPSHOT_HOSTS,
  ARCHIVE_SNAPSHOT_LABEL_PREFIX,
} from '../constants/fetch-strategy.constants';
import { readLimitedBody } from '../utilities/limited-body.utility';
import { extractPageContent } from '../utilities/page-content.utility';
import { assertPublicThirdPartyUrl } from '../utilities/public-url.utility';
import { followRedirectsSafely } from '../utilities/safe-redirect.utility';
import { toRawSnapshotUrl, waybackTimestampToIso } from '../utilities/wayback-snapshot.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';
import type {
  WaybackAvailabilityResponse,
  WaybackSnapshot,
} from '../types/wayback-availability.types';

/**
 * Last resort (ADR-121): the Internet Archive's closest Wayback snapshot —
 * never the live page. The text is ALWAYS labelled: it starts with
 * "Archived copy, captured <date> (web.archive.org)", and `archivedAt`
 * carries the capture time, so neither a model nor a person reading the
 * evidence can mistake a years-old copy for what the site says today.
 *
 * Reads the `id_` (raw) form of the snapshot, which is the page as archived
 * without the Wayback toolbar injected into it.
 */
@Injectable()
export class ArchiveSnapshotFetchAdapter implements FetchStrategyAdapter {
  readonly kind = FetchStrategyKind.ARCHIVE_SNAPSHOT;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const startedAt = Date.now();
    // The lookup tells archive.org which URL we want: same rule as the
    // reader proxy — never a private host, a token-bearing URL or a
    // signed-in-only app.
    const target = assertPublicThirdPartyUrl(request.url);
    const signal = AbortSignal.timeout(request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS);
    const snapshot = await this.findSnapshot(target.href, signal);
    if (snapshot === null) {
      throw new Error(`No Wayback snapshot available for ${request.url}`);
    }

    const { response, finalUrl } = await followRedirectsSafely(
      toRawSnapshotUrl(snapshot.url, snapshot.timestamp),
      async (url) => {
        assertSafeRequestUrl(url, ARCHIVE_SNAPSHOT_HOSTS);
        const hop = await fetch(url, {
          redirect: 'manual',
          signal,
          headers: { 'User-Agent': RESEARCH_BOT_USER_AGENT },
        });
        return { status: hop.status, location: hop.headers.get('location'), response: hop };
      },
      { maxRedirects: FETCH_MAX_REDIRECTS, allowlist: AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST },
    );
    if (!response.ok) {
      throw new Error(
        `Wayback snapshot answered HTTP ${String(response.status)} for ${request.url}`,
      );
    }
    const bytes = await readLimitedBody(response.body, FETCH_MAX_BYTES);
    const page = extractPageContent(bytes.toString('utf8'), request.url);
    const archivedAt = waybackTimestampToIso(snapshot.timestamp);
    const label = `${ARCHIVE_SNAPSHOT_LABEL_PREFIX} ${archivedAt.slice(0, 10)} (web.archive.org, ${finalUrl}). This is not the live page.`;

    return {
      url: request.url,
      finalUrl,
      httpStatus: response.status,
      mimeType: 'text/html',
      title: page.title,
      content: `${label}\n\n${page.content}`.slice(0, FETCH_MAX_CONTENT_LENGTH),
      links: page.links.slice(0, FETCH_MAX_LINKS),
      byteSize: bytes.length,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      metadata: page.metadata,
      archivedAt,
    };
  }

  private async findSnapshot(url: string, signal: AbortSignal): Promise<WaybackSnapshot | null> {
    const lookupUrl = `${ARCHIVE_SNAPSHOT_AVAILABILITY_URL}?url=${encodeURIComponent(url)}`;
    assertSafeRequestUrl(lookupUrl, ARCHIVE_SNAPSHOT_HOSTS);
    const response = await fetch(lookupUrl, {
      signal,
      headers: { 'User-Agent': RESEARCH_BOT_USER_AGENT },
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as WaybackAvailabilityResponse;
    const closest = body.archived_snapshots?.closest;
    return closest?.available === true && closest.url.length > 0
      ? { url: closest.url, timestamp: closest.timestamp }
      : null;
  }
}
