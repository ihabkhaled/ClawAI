import type { Locale } from '@/enums/locale.enum';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getPublicThreadPublication } from '@/lib/threads/public-thread-api';
import type { PublicThreadPublication } from '@/types/thread-publication.types';
import { decodeThreadSlugParam } from '@/utilities/thread-slug.utility';

/**
 * The publication a public Thread route stands for. The route parameter arrives percent-encoded,
 * so it is decoded (and NFC-normalised) before the lookup; a malformed one is simply not found.
 */
export async function loadPublicThreadFromParams(
  params: Promise<{ slug: string }>,
  lang: string | null = null,
): Promise<PublicThreadPublication | null> {
  const { slug: rawSlug } = await params;
  const slug = decodeThreadSlugParam(rawSlug);
  return slug === null ? null : getPublicThreadPublication(slug, lang);
}

/**
 * The language a reader asked for with `?lang=`, or null. Only an app language counts, so a made-up
 * value can never reach the Threads service or a canonical URL. It is the language of the Thread's
 * text, not of the app: the interface keeps the language in the path.
 */
export async function readRequestedThreadLanguage(
  searchParams: Promise<{ lang?: string | string[] }> | undefined,
): Promise<Locale | null> {
  const raw = (await searchParams)?.lang;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SUPPORTED_LOCALES.find(({ locale }) => locale === value)?.locale ?? null;
}
