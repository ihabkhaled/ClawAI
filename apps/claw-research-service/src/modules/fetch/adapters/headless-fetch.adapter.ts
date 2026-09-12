import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Browser, chromium, type Route } from 'playwright';

import { AppConfig } from '../../../app/config/app.config';
import {
  HEADLESS_BLOCKED_RESOURCE_TYPES,
  HEADLESS_RENDER_MAX_BYTES,
  HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS,
} from '../../../common/constants/headless-fetch.constants';
import { FETCH_MAX_CONTENT_LENGTH } from '../../../common/constants/fetch.constants';
import { extractHtml } from '../../../common/utilities/html-extract.utility';
import {
  assertSafeOutboundUrl,
  isHostExplicitlyAllowlisted,
} from '../../../common/utilities/url-safety.utility';
import type { FetchAdapter } from './fetch-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Renders a page in a real (headless) Chromium before extracting it —
 * `FetchService`'s fallback for a page whose real content only exists after
 * its own JavaScript runs, which `HttpFetchAdapter`'s plain GET can never
 * see. See ADR-094 for why this is a fallback INSIDE the guarded fetch path
 * rather than a second one, and why every in-page request gets the same
 * anti-SSRF check the top-level navigation gets.
 *
 * One Chromium process is shared across every call (`getBrowser`) — booting
 * a browser per request would make this adapter unusably slow — and every
 * call gets its own throwaway `BrowserContext`, so no cookies, storage or
 * cache survive between two different fetches, including two fetches of the
 * same URL.
 */
@Injectable()
export class HeadlessFetchAdapter implements FetchAdapter, OnModuleDestroy {
  private readonly logger = new Logger(HeadlessFetchAdapter.name);
  private browserPromise: Promise<Browser> | null = null;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const start = Date.now();
    const allowedHosts = AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST;
    const allowPrivateHosts = isHostExplicitlyAllowlisted(request.url, allowedHosts);
    // Fails before a browser context is ever opened for a URL that could
    // never pass — the same guard HttpFetchAdapter applies up front.
    assertSafeOutboundUrl(request.url, { allowPrivateHosts });

    const browser = await this.getBrowser();
    const context = await browser.newContext({ userAgent: 'ClawAI-ResearchBot/1.0 (+headless)' });
    try {
      const page = await context.newPage();
      // The plain HTTP adapter never executes remote code, so it never issues
      // a subrequest of its own. A rendered page can — to any host its own
      // script chooses, via an <img>, an XHR, a fetch(), a WebSocket. Every
      // one of those gets the SAME anti-SSRF check the top-level navigation
      // gets, or it is aborted before it leaves this process.
      await page.route('**/*', (route) => {
        this.guardInPageRequest(route, allowPrivateHosts);
      });
      const timeoutMs = request.timeoutMs ?? HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS;
      const response = await page.goto(request.url, {
        timeout: timeoutMs,
        waitUntil: 'networkidle',
      });
      const finalUrl = page.url();
      // fetch() following a redirect is re-checked in HttpFetchAdapter for the
      // same reason this is: the pre-flight check on the ORIGINAL url proves
      // nothing about where the page actually navigated to.
      assertSafeOutboundUrl(finalUrl, {
        allowPrivateHosts: isHostExplicitlyAllowlisted(finalUrl, allowedHosts),
      });
      const html = await page.content();
      if (html.length > HEADLESS_RENDER_MAX_BYTES) {
        throw new Error(
          `Rendered page exceeds max size (${String(HEADLESS_RENDER_MAX_BYTES)} bytes)`,
        );
      }
      const extracted = extractHtml(html, finalUrl);
      const latencyMs = Date.now() - start;
      return {
        url: request.url,
        finalUrl,
        httpStatus: response?.status() ?? 200,
        mimeType: 'text/html',
        title: extracted.title,
        content: extracted.text.slice(0, FETCH_MAX_CONTENT_LENGTH),
        links: extracted.links.slice(0, 100),
        byteSize: html.length,
        cacheHit: false,
        latencyMs,
        rawHtml: html,
        metadata: extracted.metadata,
        renderedWithHeadlessBrowser: true,
      };
    } finally {
      await context.close();
    }
  }

  private guardInPageRequest(route: Route, allowPrivateHosts: boolean): void {
    const request = route.request();
    if (HEADLESS_BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
      void route.abort();
      return;
    }
    try {
      assertSafeOutboundUrl(request.url(), { allowPrivateHosts });
    } catch {
      this.logger.warn(`Blocked in-page request to unsafe target ${request.url()}`);
      void route.abort();
      return;
    }
    void route.continue();
  }

  private async getBrowser(): Promise<Browser> {
    this.browserPromise ??= chromium.launch({ headless: true });
    return this.browserPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise === null) {
      return;
    }
    const browser = await this.browserPromise;
    await browser.close();
  }
}
