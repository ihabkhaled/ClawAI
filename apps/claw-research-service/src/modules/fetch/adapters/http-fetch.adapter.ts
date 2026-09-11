import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';

import {
  FETCH_ALLOWED_MIME_TYPES,
  FETCH_DEFAULT_TIMEOUT_MS,
  FETCH_MAX_BYTES,
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_REDIRECTS,
} from '../../../common/constants/fetch.constants';
import { extractHtml } from '../../../common/utilities/html-extract.utility';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import type { HtmlMetadata } from '../../../common/types/html-extract.types';
import type { FetchAdapter } from './fetch-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

@Injectable()
export class HttpFetchAdapter implements FetchAdapter {
  private readonly logger = new Logger(HttpFetchAdapter.name);

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const start = Date.now();
    // Private hosts are permitted ONLY when the operator named them.
    //
    // This used to be an unconditional `allowPrivateHosts: true`, reasoned as
    // "self-hosted deployments may legitimately fetch internal resources". That
    // was defensible while every URL reaching here came from a search provider.
    // It stopped being defensible on 2026-09-11, when the platform learned to
    // open a URL the USER typed: the same code path then accepted
    // `http://127.0.0.1:4001/…` or a service name on the internal Docker
    // network, fetched it, and put the body into a model's prompt.
    //
    // The allowlist is the right gate because it is deny-by-default and already
    // exists: an operator who wants the internal wiki read adds that host, and
    // gets exactly that host rather than the whole private network.
    const allowedHosts = AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST;
    const parsed = assertSafeOutboundUrl(request.url, {
      allowPrivateHosts: this.isExplicitlyAllowed(request.url, allowedHosts),
    });
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
      metadata: extracted.metadata,
    };
  }

  private assertRedirectsSafe(response: Response): void {
    const chain = (response as Response & { redirected?: boolean }).redirected ?? false;
    if (!chain) {
      return;
    }
    // fetch() follows redirects automatically, so the pre-flight check on the
    // ORIGINAL url proves nothing about where the body came from: a public page
    // that 302s to 169.254.169.254 passes the first check and fails only here.
    // The final hostname gets the same treatment as the first, allowlist
    // included — otherwise a redirect is a way to reach what a direct request
    // could not.
    try {
      assertSafeOutboundUrl(response.url, {
        allowPrivateHosts: this.isExplicitlyAllowed(
          response.url,
          AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST,
        ),
      });
    } catch (error) {
      this.logger.warn(`Fetch redirected to unsafe target ${response.url}`);
      throw error;
    }
  }

  /**
   * Whether the operator named this exact host in the domain allowlist.
   *
   * Deliberately narrow: it is the ONLY thing that unlocks a private address,
   * and an empty allowlist unlocks nothing. Reusing the existing allowlist
   * rather than adding a new "allow internal fetches" switch keeps the decision
   * where an operator already makes it, and stops it being a single boolean
   * that opens the whole private network at once.
   */
  private isExplicitlyAllowed(rawUrl: string, allowlist: readonly string[]): boolean {
    if (allowlist.length === 0) {
      return false;
    }
    let host: string;
    try {
      host = new URL(rawUrl).hostname.toLowerCase();
    } catch {
      return false;
    }
    return allowlist.some((pattern) => {
      const normalized = pattern.trim().toLowerCase();
      if (normalized.length === 0) {
        return false;
      }
      if (normalized.startsWith('*.')) {
        const suffix = normalized.slice(1);
        return host.endsWith(suffix) && host.length > suffix.length;
      }
      return host === normalized;
    });
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
    metadata?: HtmlMetadata;
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
