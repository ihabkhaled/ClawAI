import { RESEARCH_PLATFORM_DISPLAY_NAMES } from '@/constants/research-platform.constants';

/**
 * A platform's name for a search line, from the slug chat-service sends: the seeded brand name
 * ("arxiv" → "arXiv"), or the slug's words title-cased ("some-forum" → "Some Forum") for one added later.
 */
export function researchPlatformDisplayName(slug: string): string {
  const known = RESEARCH_PLATFORM_DISPLAY_NAMES[slug.toLowerCase()];
  if (known !== undefined) {
    return known;
  }
  return slug
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
