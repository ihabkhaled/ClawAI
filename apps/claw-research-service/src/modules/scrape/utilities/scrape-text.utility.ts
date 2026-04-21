import { HTML_ENTITY_MAP, HTML_ENTITY_RE } from '../../../common/constants/html-extract.constants';
import { SCRAPE_TAG_RE, SCRAPE_WS_RE } from '../constants/scrape-patterns.constants';

/**
 * Decodes common HTML entities and strips tags, collapsing whitespace.
 * Tiny helper shared across all extractors so each profile can
 * concentrate on structure, not string hygiene.
 */
export function decodeEntitiesAndStrip(raw: string): string {
  const decoded = raw.replaceAll(HTML_ENTITY_RE, (match, entity: string) => {
    const value = HTML_ENTITY_MAP[entity];
    return value ?? match;
  });
  return decoded.replaceAll(SCRAPE_TAG_RE, ' ').replaceAll(SCRAPE_WS_RE, ' ').trim();
}
