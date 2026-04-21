import { Injectable } from '@nestjs/common';

import {
  SCRAPE_ARTICLE_MAX_PARAGRAPHS,
  SCRAPE_HEADING_RE,
  SCRAPE_NAV_FOOTER_RE,
  SCRAPE_PARAGRAPH_RE,
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
export class ArticleExtractor implements ScrapeAdapter {
  readonly profileName = 'article';

  extract(input: ScrapeInput): ScrapeOutput {
    const warnings: string[] = [];
    const denoised = input.html
      .replaceAll(SCRAPE_SCRIPT_STYLE_RE, ' ')
      .replaceAll(SCRAPE_NAV_FOOTER_RE, ' ');

    const title = extractTitle(input.html);
    const headings = collectHeadings(denoised);
    const paragraphs = collectParagraphs(denoised);

    const body = paragraphs.join('\n\n');
    const truncated = body.length > SCRAPE_TEXT_MAX_CHARS;
    if (truncated) {
      warnings.push('text_truncated');
    }

    return {
      profile: ExtractionProfile.ARTICLE,
      title,
      text: truncated ? body.slice(0, SCRAPE_TEXT_MAX_CHARS) : body,
      structured: {
        headings,
        paragraphs: paragraphs.slice(0, SCRAPE_ARTICLE_MAX_PARAGRAPHS),
      },
      warnings,
    };
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const raw = match?.[1];
  if (raw === undefined) {
    return null;
  }
  return decodeEntitiesAndStrip(raw).trim() || null;
}

function collectHeadings(html: string): Array<{ level: number; text: string }> {
  const out: Array<{ level: number; text: string }> = [];
  const re = new RegExp(SCRAPE_HEADING_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[1];
    const inner = match[2];
    if (tag === undefined || inner === undefined) {
      continue;
    }
    const level = Number.parseInt(tag.slice(1), 10);
    const text = decodeEntitiesAndStrip(inner).trim();
    if (text.length > 0) {
      out.push({ level, text });
    }
  }
  return out;
}

function collectParagraphs(html: string): string[] {
  const out: string[] = [];
  const re = new RegExp(SCRAPE_PARAGRAPH_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const inner = match[1];
    if (inner === undefined) {
      continue;
    }
    const text = decodeEntitiesAndStrip(inner)
      .replaceAll(SCRAPE_TAG_RE, ' ')
      .replaceAll(SCRAPE_WS_RE, ' ')
      .trim();
    if (text.length > 0) {
      out.push(text);
    }
  }
  return out;
}
