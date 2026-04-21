import { Injectable } from '@nestjs/common';

import { ScrapeAdapterFactory } from '../adapters/scrape-adapter.factory';
import type { ExtractionProfile } from '../enums/extraction-profile.enum';
import type { ScrapeOutput } from '../types/scrape.types';

/**
 * Thin dispatcher: picks an extractor by profile and runs it on
 * pre-fetched HTML. No I/O — fetching is the FetchService's job, and
 * SSRF + domain enforcement already happened before the HTML was
 * produced. We keep this service small so it can be composed from
 * ResearchManager or called directly via the future /scrape endpoint.
 */
@Injectable()
export class ScrapeService {
  constructor(private readonly factory: ScrapeAdapterFactory) {}

  extract(html: string, url: string, profile: ExtractionProfile): ScrapeOutput {
    const adapter = this.factory.getAdapter(profile);
    return adapter.extract({ html, url, profile });
  }
}
