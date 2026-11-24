import { Injectable, Logger } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  RESEARCH_MAX_RESULTS,
  RESEARCH_PLATFORM_USER,
  RESEARCH_RUNS_PATH,
  RESEARCH_SNIPPET_MAX_CHARS,
  RESEARCH_TIMEOUT_MS,
} from '../constants/processing.constants';
import { researchRunReplySchema } from '../schemas/processing.schemas';
import type { WebNote } from '../types/processing.types';
import { webHost } from '../utilities/stream-prompt.utility';

/**
 * research-service `POST /api/v1/internal/research/runs` (Service auth, SEARCH_ONLY) for the
 * summarizer's context search (2026-11-24). Platform-paid under `RESEARCH_PLATFORM_USER`. Returns
 * title, snippet and host only: a URL never reaches a prompt, so a card can never carry one.
 * Any failure is an empty list; the feed never waits on, or fails for, research.
 */
@Injectable()
export class LiveResearchClient {
  private readonly logger = new Logger(LiveResearchClient.name);

  async search(query: string, requestId: string): Promise<WebNote[]> {
    const app = AppConfig.get();
    const url = `${app.RESEARCH_SERVICE_URL}${RESEARCH_RUNS_PATH}`;
    try {
      assertSafeRequestUrl(url, declaredHost(app.RESEARCH_SERVICE_URL));
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          Authorization: `Service ${app.INTER_SERVICE_AUTH_TOKEN}`,
          'x-request-id': requestId,
        },
        body: JSON.stringify({
          userId: RESEARCH_PLATFORM_USER,
          intent: query,
          workflow: 'SEARCH_ONLY',
          mode: 'compressed',
          maxResults: RESEARCH_MAX_RESULTS,
        }),
        signal: AbortSignal.timeout(RESEARCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`research ${requestId} answered ${String(response.status)}`);
        return [];
      }
      const parsed = researchRunReplySchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) return [];
      return parsed.data.bundle.items.slice(0, RESEARCH_MAX_RESULTS).flatMap((item) => {
        const host = webHost(item.url);
        const title = (item.title ?? '').trim();
        if (host === null || title === '') return [];
        return [
          { query, title, snippet: item.snippet.slice(0, RESEARCH_SNIPPET_MAX_CHARS).trim(), host },
        ];
      });
    } catch {
      this.logger.warn(`research ${requestId} failed`);
      return [];
    }
  }
}
