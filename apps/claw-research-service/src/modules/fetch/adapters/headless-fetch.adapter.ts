import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Browser, chromium, type Response as PageResponse, type Route } from 'patchright';

import { AppConfig } from '../../../app/config/app.config';
import {
  HEADLESS_BLOCKED_RESOURCE_TYPES,
  HEADLESS_IDLE_WAIT_MS,
  HEADLESS_RENDER_MAX_BYTES,
  HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS,
} from '../../../common/constants/headless-fetch.constants';
import {
  FETCH_MAX_CONTENT_LENGTH,
  FETCH_MAX_LINKS,
} from '../../../common/constants/fetch.constants';
import {
  assertSafeOutboundUrl,
  isHostExplicitlyAllowlisted,
} from '../../../common/utilities/url-safety.utility';
import { FetchStrategyKind } from '../../../generated/prisma';
import { desktopChromeUserAgent } from '../utilities/browser-user-agent.utility';
import { extractPageContent } from '../utilities/page-content.utility';
import type { FetchStrategyAdapter } from './fetch-strategy-adapter.interface';
import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Tier 3 (ADR-121, previously ADR-094): renders the page in a real headless
 * Chromium before extracting it, for pages whose content only exists after
 * their own JavaScript runs.
 *
 * Driven by Patchright, a drop-in fork of Playwright that removes the
 * automation tells (`Runtime.enable` leaks, `navigator.webdriver`, the
 * `HeadlessChrome` User-Agent is replaced below) that make some sites serve
 * a blank page to an obvious bot. Same API, same browser binary family.
 *
 * Every in-page request — including the page's own XHR/fetch/WebSocket and
 * every hop of the navigation's redirect chain — gets the SAME anti-SSRF
 * check the top-level navigation gets. One Chromium is shared across calls;
 * each call gets its own throwaway context, so no cookies survive.
 */
@Injectable()
export class HeadlessFetchAdapter implements FetchStrategyAdapter, OnModuleDestroy {
  readonly kind = FetchStrategyKind.HEADLESS_BROWSER;
  private readonly logger = new Logger(HeadlessFetchAdapter.name);
  private browserPromise: Promise<Browser> | null = null;

  async fetchPage(request: FetchRequest): Promise<FetchResult> {
    const start = Date.now();
    const allowedHosts = AppConfig.get().RESEARCH_DOMAIN_ALLOWLIST;
    const allowPrivateHosts = isHostExplicitlyAllowlisted(request.url, allowedHosts);
    assertSafeOutboundUrl(request.url, { allowPrivateHosts });

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: desktopChromeUserAgent(browser.version()),
    });
    try {
      const page = await context.newPage();
      await page.route('**/*', (route) => {
        this.guardInPageRequest(route, allowPrivateHosts);
      });
      const timeoutMs = request.timeoutMs ?? HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS;
      const response = await page.goto(request.url, { timeout: timeoutMs, waitUntil: 'load' });
      // A page that keeps a socket open never goes "idle"; waiting a bounded
      // moment for late XHR content is enough, and a timeout here is normal.
      await page
        .waitForLoadState('networkidle', { timeout: HEADLESS_IDLE_WAIT_MS })
        .catch(() => null);
      const finalUrl = page.url();
      this.assertRedirectChainSafe(response, finalUrl, allowedHosts);

      const html = await page.content();
      if (html.length > HEADLESS_RENDER_MAX_BYTES) {
        throw new Error(
          `Rendered page exceeds max size (${String(HEADLESS_RENDER_MAX_BYTES)} bytes)`,
        );
      }
      const extracted = extractPageContent(html, finalUrl);
      return {
        url: request.url,
        finalUrl,
        httpStatus: response?.status() ?? 200,
        mimeType: 'text/html',
        title: extracted.title,
        content: extracted.content.slice(0, FETCH_MAX_CONTENT_LENGTH),
        links: extracted.links.slice(0, FETCH_MAX_LINKS),
        byteSize: html.length,
        cacheHit: false,
        latencyMs: Date.now() - start,
        rawHtml: html,
        metadata: extracted.metadata,
        renderedWithHeadlessBrowser: true,
      };
    } finally {
      await context.close();
    }
  }

  /**
   * Walks the navigation's redirect chain and the final URL through the SSRF
   * guard. The route handler already aborts unsafe requests it sees; this is
   * the second, independent check that nothing we are about to return came
   * from, or passed through, a host we would have refused.
   */
  private assertRedirectChainSafe(
    response: PageResponse | null,
    finalUrl: string,
    allowedHosts: readonly string[],
  ): void {
    const urls = [finalUrl];
    let hop = response?.request().redirectedFrom() ?? null;
    while (hop !== null) {
      urls.push(hop.url());
      hop = hop.redirectedFrom();
    }
    for (const url of urls) {
      assertSafeOutboundUrl(url, {
        allowPrivateHosts: isHostExplicitlyAllowlisted(url, allowedHosts),
      });
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
