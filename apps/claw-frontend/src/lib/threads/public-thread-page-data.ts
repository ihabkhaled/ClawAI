import { getPublicThreadPublication } from '@/lib/threads/public-thread-api';
import type { PublicThreadPublication } from '@/types/thread-publication.types';
import { decodeThreadSlugParam } from '@/utilities/thread-slug.utility';

/**
 * The publication a public Thread route stands for. The route parameter arrives percent-encoded,
 * so it is decoded (and NFC-normalised) before the lookup; a malformed one is simply not found.
 */
export async function loadPublicThreadFromParams(
  params: Promise<{ slug: string }>,
): Promise<PublicThreadPublication | null> {
  const { slug: rawSlug } = await params;
  const slug = decodeThreadSlugParam(rawSlug);
  return slug === null ? null : getPublicThreadPublication(slug);
}
