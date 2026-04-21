import type { ScrapeInput, ScrapeOutput } from '../types/scrape.types';

/**
 * One extraction profile = one ScrapeAdapter. Implementations must be
 * pure functions of their input (no I/O, no mutable state) so they're
 * safe to run in parallel over a fetched page set.
 *
 * Future extension points (tracked for Session 2+):
 *   - headless-browser extractor for JS-heavy pages
 *   - reader-mode extractor via Mozilla Readability
 *   - PDF extractor
 */
export interface ScrapeAdapter {
  readonly profileName: string;
  extract(input: ScrapeInput): ScrapeOutput;
}
