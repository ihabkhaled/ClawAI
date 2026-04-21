import { Injectable } from '@nestjs/common';

import {
  SCRAPE_DOCS_MAX_HEADINGS,
  SCRAPE_HEADING_RE,
  SCRAPE_NAV_FOOTER_RE,
  SCRAPE_SCRIPT_STYLE_RE,
  SCRAPE_TAG_RE,
  SCRAPE_TEXT_MAX_CHARS,
  SCRAPE_WS_RE,
} from '../constants/scrape-patterns.constants';
import { ExtractionProfile } from '../enums/extraction-profile.enum';
import { decodeEntitiesAndStrip } from '../utilities/scrape-text.utility';
import type { ScrapeAdapter } from './scrape-adapter.interface';
import type { ScrapeInput, ScrapeOutput } from '../types/scrape.types';

@Injectable()
export class DocsExtractor implements ScrapeAdapter {
  readonly profileName = 'docs';

  extract(input: ScrapeInput): ScrapeOutput {
    const warnings: string[] = [];
    const denoised = input.html
      .replaceAll(SCRAPE_SCRIPT_STYLE_RE, ' ')
      .replaceAll(SCRAPE_NAV_FOOTER_RE, ' ')
      .replaceAll(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ');

    const outline = collectOutline(denoised);
    const text = denoised.replaceAll(SCRAPE_TAG_RE, ' ').replaceAll(SCRAPE_WS_RE, ' ').trim();

    const truncated = text.length > SCRAPE_TEXT_MAX_CHARS;
    if (truncated) {
      warnings.push('text_truncated');
    }

    return {
      profile: ExtractionProfile.DOCS,
      title: outline[0]?.text ?? null,
      text: truncated ? text.slice(0, SCRAPE_TEXT_MAX_CHARS) : text,
      structured: { outline },
      warnings,
    };
  }
}

function collectOutline(html: string): Array<{ level: number; text: string }> {
  const out: Array<{ level: number; text: string }> = [];
  const re = new RegExp(SCRAPE_HEADING_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (out.length >= SCRAPE_DOCS_MAX_HEADINGS) {
      break;
    }
    const tag = match[1];
    const inner = match[2];
    if (tag === undefined || inner === undefined) {
      continue;
    }
    const text = decodeEntitiesAndStrip(inner).trim();
    if (text.length > 0) {
      out.push({ level: Number.parseInt(tag.slice(1), 10), text });
    }
  }
  return out;
}
