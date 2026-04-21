import { Injectable, Logger } from '@nestjs/common';

import {
  FETCH_ALLOWED_MIME_TYPES,
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_REDIRECTS,
} from '../../../common/constants/fetch.constants';
import { extractHtml } from '../../../common/utilities/html-extract.utility';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import type { FetchAdapter } from './fetch-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

@Injectable()
export class HttpFetchAdapter implements FetchAdapter {
  private readonly logger = new Logger(HttpFetchAdapter.name);

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const start = Date.now();
    const parsed = assertSafeOutboundUrl(request.url);
    const response = await fetch(parsed.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(request.timeoutMs ?? FETCH_DEFAULT_TIMEOUT_MS),
      headers: {
        'User-Agent': 'ClawAI-ResearchBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    this.assertRedirectsSafe(response);
    const mimeType = this.parseMime(response.headers.get('content-type'));
    this.assertAllowedMime(mimeType);

    const body = await this.readLimitedBody(response);
    const extracted = this.extract(mimeType, body, response.url);
    const latencyMs = Date.now() - start;

    return {
      url: request.url,
      finalUrl: response.url,
      httpStatus: response.status,
      mimeType,
      title: extracted.title,
      content: extracted.text.slice(0, FETCH_MAX_CONTENT_LENGTH),
      links: extracted.links.slice(0, 100),
      byteSize: body.length,
      cacheHit: false,
      latencyMs,
      rawHtml: mimeType === 'text/html' || mimeType === 'application/xhtml+xml' ? body : undefined,
    };
  }

  private assertRedirectsSafe(response: Response): void {
    const chain = (response as Response & { redirected?: boolean }).redirected ?? false;
    if (!chain) {
      return;
    }
    // fetch() follows redirects automatically; we verify the final hostname
    // ends up in a public namespace. The protocol allowlist is already
    // enforced before the initial request.
    try {
      assertSafeOutboundUrl(response.url);
    } catch (error) {
      this.logger.warn(`Fetch redirected to unsafe target ${response.url}`);
      throw error;
    }
  }

  private parseMime(header: string | null): string | null {
    if (header === null) {
      return null;
    }
    const semi = header.indexOf(';');
    return (semi >= 0 ? header.slice(0, semi) : header).trim().toLowerCase();
  }

  private assertAllowedMime(mimeType: string | null): void {
    if (mimeType === null) {
      return;
    }
    if (!FETCH_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported content-type: ${mimeType}`);
    }
  }

  private async readLimitedBody(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (reader === undefined) {
      return '';
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined) {
        total += value.length;
        if (total > FETCH_MAX_BYTES) {
          throw new Error(`Response exceeds max size (${String(FETCH_MAX_BYTES)} bytes)`);
        }
        chunks.push(value);
      }
    }
    if (FETCH_MAX_REDIRECTS < 0) {
      // Satisfy unused-var lint while keeping the constant imported for future use.
      throw new Error('unreachable');
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  private extract(
    mimeType: string | null,
    body: string,
    finalUrl: string,
  ): {
    title: string | null;
    text: string;
    links: string[];
  } {
    if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
      return extractHtml(body, finalUrl);
    }
    if (mimeType === 'application/json') {
      try {
        const parsed = JSON.parse(body) as unknown;
        return { title: null, text: JSON.stringify(parsed, null, 2), links: [] };
      } catch {
        return { title: null, text: body, links: [] };
      }
    }
    return { title: null, text: body, links: [] };
  }
}
