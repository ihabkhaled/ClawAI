import { Locale } from '@claw/shared-types';

import {
  ACCEPT_LANGUAGE_MAX_ENTRIES,
  ACCEPT_LANGUAGE_MAX_LENGTH,
  SUPPORTED_LOCALES,
} from '../constants/catalog.constants';
import { type WeightedTag } from '../types/accept-language.types';

function parseEntry(raw: string, order: number): WeightedTag | null {
  const [tagPart, ...params] = raw.split(';');
  const tag = (tagPart ?? '').trim().toLowerCase();
  if (tag === '' || tag === '*') return null;
  let weight = 1;
  for (const param of params) {
    const [key, value] = param.split('=');
    if (key?.trim() === 'q') {
      const parsed = Number(value);
      weight = Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return { tag, weight, order };
}

/**
 * Picks the best supported locale from an Accept-Language header by q-value,
 * matching on the primary subtag (pt-BR gives pt, zh-Hans gives zh). Hostile
 * input is bounded by length and entry count. Returns undefined when nothing
 * matches so the caller can fall back to English.
 */
export function parseAcceptLanguage(header: string | undefined): Locale | undefined {
  if (header === undefined || header === '') return undefined;
  const entries = header
    .slice(0, ACCEPT_LANGUAGE_MAX_LENGTH)
    .split(',')
    .slice(0, ACCEPT_LANGUAGE_MAX_ENTRIES)
    .map((raw, order) => parseEntry(raw, order))
    .filter((entry): entry is WeightedTag => entry !== null && entry.weight > 0)
    .sort((left, right) => right.weight - left.weight || left.order - right.order);
  for (const entry of entries) {
    const primary = entry.tag.split('-')[0] ?? '';
    const match = SUPPORTED_LOCALES.find((locale) => locale === primary);
    if (match !== undefined) return match as Locale;
  }
  return undefined;
}

/** An explicit locale wins over the header; English is the final fallback. */
export function resolveLocale(explicit: Locale | undefined, acceptLanguage?: string): Locale {
  return explicit ?? parseAcceptLanguage(acceptLanguage) ?? Locale.EN;
}
