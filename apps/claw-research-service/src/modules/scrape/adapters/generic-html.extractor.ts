import { Injectable } from '@nestjs/common';

import {
  SCRAPE_SCRIPT_STYLE_RE,
  SCRAPE_TAG_RE,
  SCRAPE_TEXT_MAX_CHARS,
  SCRAPE_WS_RE,
} from '../constants/scrape-patterns.constants';
import { ExtractionProfile } from '../enums/extraction-profile.enum';
import type { ScrapeAdapter } from './scrape-adapter.interface';
import type { ScrapeInput, ScrapeOutput } from '../types/scrape.types';

/**
 * Fallback profile: strip scripts/tags and collapse whitespace.
 * Produces plain text with no structured output. Useful as a safe
 * default when the user hasn't picked a specific profile.
 */
@Injectable()
export class GenericHtmlExtractor implements ScrapeAdapter {
  readonly profileName = 'generic-html';

  extract(input: ScrapeInput): ScrapeOutput {
    const warnings: string[] = [];
    const text = input.html
      .replaceAll(SCRAPE_SCRIPT_STYLE_RE, ' ')
      .replaceAll(SCRAPE_TAG_RE, ' ')
      .replaceAll(SCRAPE_WS_RE, ' ')
      .trim();

    const truncated = text.length > SCRAPE_TEXT_MAX_CHARS;
    if (truncated) {
      warnings.push('text_truncated');
    }

    return {
      profile: ExtractionProfile.GENERIC_HTML,
      title: null,
      text: truncated ? text.slice(0, SCRAPE_TEXT_MAX_CHARS) : text,
      structured: {},
      warnings,
    };
  }
}
