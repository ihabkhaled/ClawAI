import {
  FETCH_ALLOWED_MIME_TYPES,
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_LINKS,
  HTML_MIME_TYPES,
  RAW_BODY_PRESERVED_MIME_TYPES,
} from '../../../common/constants/fetch.constants';
import { extractPageContent } from './page-content.utility';
import type { RawBodyInput } from '../types/raw-body-result.types';
import type { FetchResult } from '../types/fetch.types';

/**
 * Turns a raw HTTP body into a `FetchResult` — shared by the plain and the
 * TLS-impersonating strategies so the same bytes always produce the same
 * result whichever client fetched them.
 */
export function buildResultFromRawBody(input: RawBodyInput): FetchResult {
  assertAllowedMime(input.mimeType);
  const mime = input.mimeType ?? '';
  const extracted = extractBody(input.mimeType, input.body, input.finalUrl);
  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    mimeType: input.mimeType,
    title: extracted.title,
    content: extracted.content.slice(0, FETCH_MAX_CONTENT_LENGTH),
    links: extracted.links.slice(0, FETCH_MAX_LINKS),
    byteSize: input.byteSize,
    cacheHit: false,
    latencyMs: Date.now() - input.startedAt,
    rawHtml: RAW_BODY_PRESERVED_MIME_TYPES.has(mime) ? input.body : undefined,
    metadata: extracted.metadata,
  };
}

/** Throws for a content type we never parse (images, binaries, …). */
export function assertAllowedMime(mimeType: string | null): void {
  if (mimeType !== null && !FETCH_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported content-type: ${mimeType}`);
  }
}

function extractBody(
  mimeType: string | null,
  body: string,
  finalUrl: string,
): Pick<FetchResult, 'title' | 'content' | 'links' | 'metadata'> {
  if (mimeType !== null && HTML_MIME_TYPES.has(mimeType)) {
    const page = extractPageContent(body, finalUrl);
    return { title: page.title, content: page.content, links: page.links, metadata: page.metadata };
  }
  if (mimeType === 'application/json') {
    return { title: null, content: prettyJson(body), links: [] };
  }
  return { title: null, content: body, links: [] };
}

function prettyJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body) as unknown, null, 2);
  } catch {
    return body;
  }
}
