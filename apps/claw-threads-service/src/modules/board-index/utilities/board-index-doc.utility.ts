import { publicationExcerpt } from '../../publications/utilities/publication-excerpt.utility';
import {
  BOARD_BODY_MAX_CHARS,
  BOARD_CITATION_MARKER,
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

/** Removes internal source markers so they are neither displayed nor searchable. */
export function stripCitationMarkers(text: string): string {
  return text.replaceAll(BOARD_CITATION_MARKER, ' ').replaceAll(/[ \t]{2,}/gu, ' ');
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
