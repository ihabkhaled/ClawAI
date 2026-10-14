import { publicationExcerpt } from '../../publications/utilities/publication-excerpt.utility';
import {
  BOARD_BODY_MAX_CHARS,
  BOARD_CITATION_ID,
  BOARD_CITATION_NARROW_RUN,
  BOARD_CITATION_TOKEN_SEPARATOR,
  BOARD_CJK_CHARACTER,
  BOARD_CJK_CHARS_PER_MINUTE,
  BOARD_DEFAULT_TEXT_SEARCH_CONFIG,
  BOARD_DOC_FORMAT_VERSION,
  BOARD_TEXT_SEARCH_CONFIG_MAP,
  BOARD_WORDS_PER_MINUTE,
} from '../constants/board-index.constants';
import type { BoardIndexDoc, BoardIndexSource } from '../types/board-index.types';
import { normalizeSearchText } from './board-search-normalizer.utility';

export function textSearchConfigFor(locale: string): string {
  const language = locale.split('-')[0]?.toLowerCase() ?? '';
  return BOARD_TEXT_SEARCH_CONFIG_MAP.get(language) ?? BOARD_DEFAULT_TEXT_SEARCH_CONFIG;
}

export function estimateReadingMinutes(text: string): number {
  const cjk = text.match(BOARD_CJK_CHARACTER)?.length ?? 0;
  const words = text.replaceAll(BOARD_CJK_CHARACTER, ' ').split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / BOARD_WORDS_PER_MINUTE + cjk / BOARD_CJK_CHARS_PER_MINUTE));
}

/**
 * Removes internal source markers so they are neither displayed nor searchable.
 *
 * A linear scan, not one regex over the whole body: a bracket run is the longest stretch of
 * bracket, comma, space and hex characters from a '[', and it is only a candidate up to its last ']'.
 * A run without a closing bracket is skipped whole and the search for its closing bracket stays inside the run, so a body of unclosed '[' cannot make the cost
 * grow with the square of its length (ReDoS).
 */
export function stripCitationMarkers(text: string): string {
  let output = '';
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('[', index);
    if (open < 0) {
      output += text.slice(index);
      break;
    }
    output += text.slice(index, open);
    let runEnd = open + 1;
    while (runEnd < text.length && isMarkerRunCharacter(text.charAt(runEnd))) runEnd += 1;
    const closeInRun = text.slice(open + 1, runEnd).lastIndexOf(']');
    const close = closeInRun < 0 ? -1 : open + 1 + closeInRun;
    if (close > open) {
      output += stripMarkersInRun(text.slice(open, close + 1));
      index = close + 1;
    } else {
      output += text.slice(open, runEnd);
      index = runEnd;
    }
  }
  return output.replaceAll(/[ \t]{2,}/gu, ' ');
}

function isMarkerRunCharacter(character: string): boolean {
  return /[\s,[\]0-9a-f]/iu.test(character);
}

/** A whole run of 16-hex ids becomes a space; otherwise only the marker groups inside it do. */
function stripMarkersInRun(run: string): string {
  const whole = markerRunOrKept(run);
  return whole === run ? run.replaceAll(BOARD_CITATION_NARROW_RUN, markerRunOrKept) : whole;
}

/** A bracket run made only of 16-hex ids (one, a comma list or a nested list) becomes a space. */
function markerRunOrKept(run: string): string {
  const tokens = run.split(BOARD_CITATION_TOKEN_SEPARATOR).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => BOARD_CITATION_ID.test(token)) ? ' ' : run;
}

export function buildBoardIndexDoc(rawSource: BoardIndexSource): BoardIndexDoc {
  const source = {
    ...rawSource,
    title: stripCitationMarkers(rawSource.title).trim(),
    markdown: stripCitationMarkers(rawSource.markdown),
  };
  return {
    publicationId: source.publicationId,
    slug: source.slug,
    contentLocale: source.contentLocale,
    publicationType: source.publicationType,
    publishedAt: source.publishedAt,
    title: source.title,
    excerpt: publicationExcerpt(source.markdown),
    titleNorm: normalizeSearchText(source.title),
    bodyNorm: normalizeSearchText(source.markdown).slice(0, BOARD_BODY_MAX_CHARS),
    readingMinutes: estimateReadingMinutes(source.markdown),
    sourceCount: source.sourceCount,
    likeCount: source.likeCount,
    dislikeCount: source.dislikeCount,
    commentCount: source.commentCount,
    viewCount: source.viewCount,
    textSearchConfig: textSearchConfigFor(source.contentLocale),
    formatVersion: BOARD_DOC_FORMAT_VERSION,
  };
}
