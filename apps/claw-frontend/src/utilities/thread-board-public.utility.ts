import { THREAD_BOARD_TYPES } from '@/constants/thread-board.constants';
import type {
  ThreadBoardItem,
  ThreadBoardListResponse,
  ThreadBoardMeta,
  ThreadBoardSuggestion,
  ThreadBoardSuggestResponse,
} from '@/types/thread-board.types';

type Fields = Record<string, unknown>;

const SLUG_PATTERN = /^[a-zA-Z0-9-]{1,64}$/u;

function asFields(value: unknown): Fields | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function publicationType(value: unknown): ThreadBoardItem['publicationType'] | null {
  return THREAD_BOARD_TYPES.find((type) => type === value) ?? null;
}

function ranges(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: [number, number][] = [];
  for (const pair of value) {
    if (Array.isArray(pair) && pair.length === 2) {
      const [start, end] = pair;
      if (typeof start === 'number' && typeof end === 'number' && start >= 0 && end > start) {
        out.push([start, end]);
      }
    }
  }
  return out;
}

/**
 * Keeps only the fields a guest may see. The API already omits private data; picking known
 * fields here means a future server field (owner, author, hashes, safety data, the viewer's own
 * reaction) can never reach a guest page or its serialized state by accident.
 */
export function toPublicBoardItem(raw: unknown): ThreadBoardItem | null {
  const fields = asFields(raw);
  if (fields === null) {
    return null;
  }
  const slug = text(fields['slug']);
  const title = text(fields['title']);
  const contentLocale = text(fields['contentLocale']);
  const publishedAt = text(fields['publishedAt']);
  const type = publicationType(fields['publicationType']);
  if (
    slug === null ||
    !SLUG_PATTERN.test(slug) ||
    title === null ||
    contentLocale === null ||
    publishedAt === null ||
    type === null
  ) {
    return null;
  }
  return {
    slug,
    title,
    excerpt: typeof fields['excerpt'] === 'string' ? fields['excerpt'] : '',
    contentLocale,
    publicationType: type,
    publishedAt,
    readingMinutes: count(fields['readingMinutes']),
    sourceCount: count(fields['sourceCount']),
    likeCount: count(fields['likeCount']),
    commentCount: count(fields['commentCount']),
    viewCount: count(fields['viewCount']),
    viewerReaction: null,
  };
}

function toMeta(raw: unknown, itemCount: number): ThreadBoardMeta {
  const fields = asFields(raw) ?? {};
  return {
    total: count(fields['total']) || itemCount,
    page: Math.max(1, count(fields['page'])),
    limit: Math.max(1, count(fields['limit'])),
    totalPages: Math.max(1, count(fields['totalPages'])),
  };
}

export function toPublicBoardList(raw: unknown): ThreadBoardListResponse | null {
  const fields = asFields(raw);
  if (fields === null || !Array.isArray(fields['items'])) {
    return null;
  }
  const items: ThreadBoardItem[] = [];
  for (const entry of fields['items']) {
    const item = toPublicBoardItem(entry);
    if (item !== null) {
      items.push(item);
    }
  }
  return {
    items,
    meta: toMeta(fields['meta'], items.length),
    didYouMean: text(fields['didYouMean']),
  };
}

function toPublicSuggestion(raw: unknown): ThreadBoardSuggestion | null {
  const item = toPublicBoardItem(raw);
  const fields = asFields(raw);
  if (item === null || fields === null) {
    return null;
  }
  return {
    slug: item.slug,
    title: item.title,
    publicationType: item.publicationType,
    contentLocale: item.contentLocale,
    publishedAt: item.publishedAt,
    match: ranges(fields['match']),
  };
}

export function toPublicBoardSuggest(raw: unknown): ThreadBoardSuggestResponse | null {
  const fields = asFields(raw);
  if (fields === null || !Array.isArray(fields['suggestions'])) {
    return null;
  }
  const suggestions: ThreadBoardSuggestion[] = [];
  for (const entry of fields['suggestions']) {
    const suggestion = toPublicSuggestion(entry);
    if (suggestion !== null) {
      suggestions.push(suggestion);
    }
  }
  return {
    suggestions,
    didYouMean: text(fields['didYouMean']),
    total: count(fields['total']),
    totalCapped: fields['totalCapped'] === true,
  };
}
